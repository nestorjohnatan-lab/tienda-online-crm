import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/domain/app-error.js';
import { dbPool, withTransaction } from '../../../shared/infrastructure/database/pool.js';
import type {
  MarketplaceRepositoryPort,
  OrderMessageRecord,
  ProductQuestionRecord,
  ProductReviewRecord,
  RegisterStoreTxInput,
  StoreSummary,
} from '../domain/marketplace.repository.js';

interface StoreRow {
  store_id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'suspended' | 'pending';
  rating_average: string | number;
  rating_count: number;
  sales_count: number;
  response_rate_pct: number;
  is_verified: number;
  products_count: number | bigint;
  created_at: Date;
}

export class MariaDbMarketplaceRepository implements MarketplaceRepositoryPort {
  async listPublicStores(): Promise<StoreSummary[]> {
    const rows = (await dbPool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM products p WHERE p.store_id = s.store_id AND p.is_active = 1 AND p.deleted_at IS NULL) AS products_count
         FROM stores s
        WHERE s.status = 'active' AND s.deleted_at IS NULL
        ORDER BY s.is_verified DESC, s.rating_average DESC, s.sales_count DESC, s.store_id ASC`,
    )) as StoreRow[];
    return rows.map((r) => this.mapStore(r));
  }

  async getPublicStoreBySlug(slug: string): Promise<StoreSummary | null> {
    const rows = (await dbPool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM products p WHERE p.store_id = s.store_id AND p.is_active = 1 AND p.deleted_at IS NULL) AS products_count
         FROM stores s
        WHERE s.slug = ? AND s.status = 'active' AND s.deleted_at IS NULL
        LIMIT 1`,
      [slug],
    )) as StoreRow[];
    return rows[0] ? this.mapStore(rows[0]) : null;
  }

  async getStoreById(storeId: number): Promise<StoreSummary | null> {
    const rows = (await dbPool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM products p WHERE p.store_id = s.store_id AND p.is_active = 1 AND p.deleted_at IS NULL) AS products_count
         FROM stores s
        WHERE s.store_id = ? AND s.deleted_at IS NULL
        LIMIT 1`,
      [storeId],
    )) as StoreRow[];
    return rows[0] ? this.mapStore(rows[0]) : null;
  }

  async findUserEmailExists(email: string): Promise<boolean> {
    const rows = (await dbPool.query(
      `SELECT 1 AS ok FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase()],
    )) as { ok: number }[];
    return rows.length > 0;
  }

  async findStoreSlugExists(slug: string): Promise<boolean> {
    const rows = (await dbPool.query(
      `SELECT 1 AS ok FROM stores WHERE slug = ? AND deleted_at IS NULL LIMIT 1`,
      [slug],
    )) as { ok: number }[];
    return rows.length > 0;
  }

  async registerStoreOwner(input: RegisterStoreTxInput) {
    const { userId, storeId } = await withTransaction(async (conn) => {
      const userRes = (await conn.query(
        `INSERT INTO users (full_name, email, password_hash, role, is_active, last_login_at)
         VALUES (?, ?, ?, 'admin', 1, NOW(3))`,
        [input.owner_name, input.owner_email.toLowerCase(), input.password_hash],
      )) as { insertId: number };
      const createdUserId = Number(userRes.insertId);

      const storeRes = (await conn.query(
        `INSERT INTO stores (owner_user_id, name, slug, description, logo_url, city, phone, email, status, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
        [
          createdUserId,
          input.store_name,
          input.store_slug,
          input.description,
          input.logo_url,
          input.city,
          input.phone,
          input.owner_email.toLowerCase(),
        ],
      )) as { insertId: number };
      const createdStoreId = Number(storeRes.insertId);

      await conn.query(`UPDATE users SET store_id = ? WHERE user_id = ?`, [
        createdStoreId,
        createdUserId,
      ]);

      return { userId: createdUserId, storeId: createdStoreId };
    });

    const store = await this.getStoreById(storeId);
    if (!store) throw new Error('Invariant broken: tienda recién creada no encontrada');

    return {
      user: {
        user_id: userId,
        full_name: input.owner_name,
        email: input.owner_email.toLowerCase(),
        role: 'admin' as const,
        store_id: storeId,
      },
      store,
    };
  }

  async updateStore(
    storeId: number,
    input: {
      name: string;
      description: string | null;
      city: string | null;
      phone: string | null;
      email: string | null;
      logo_url: string | null;
      banner_url: string | null;
    },
  ): Promise<StoreSummary | null> {
    await dbPool.query(
      `UPDATE stores
          SET name = ?, description = ?, city = ?, phone = ?, email = ?, logo_url = ?, banner_url = ?
        WHERE store_id = ? AND deleted_at IS NULL`,
      [
        input.name,
        input.description,
        input.city,
        input.phone,
        input.email,
        input.logo_url,
        input.banner_url,
        storeId,
      ],
    );
    return this.getStoreById(storeId);
  }

  async getProductStoreId(productId: number): Promise<number | null> {
    const rows = (await dbPool.query(
      `SELECT store_id FROM products WHERE product_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`,
      [productId],
    )) as { store_id: number }[];
    return rows[0] ? Number(rows[0].store_id) : null;
  }

  async listProductQuestions(productId: number): Promise<ProductQuestionRecord[]> {
    const rows = (await dbPool.query(
      `SELECT question_id, product_id, store_id, customer_name, question_text, answer_text, answered_at, status, created_at
         FROM product_questions
        WHERE product_id = ? AND status <> 'hidden' AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 50`,
      [productId],
    )) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapQuestion(r));
  }

  async createProductQuestion(input: {
    product_id: number;
    store_id: number;
    user_id: number | null;
    customer_name: string;
    customer_email: string | null;
    question_text: string;
  }): Promise<ProductQuestionRecord> {
    const res = (await dbPool.query(
      `INSERT INTO product_questions (product_id, store_id, user_id, customer_name, customer_email, question_text, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        input.product_id,
        input.store_id,
        input.user_id,
        input.customer_name,
        input.customer_email,
        input.question_text,
      ],
    )) as { insertId: number };

    const rows = (await dbPool.query(
      `SELECT question_id, product_id, store_id, customer_name, question_text, answer_text, answered_at, status, created_at
         FROM product_questions WHERE question_id = ? LIMIT 1`,
      [Number(res.insertId)],
    )) as Array<Record<string, unknown>>;
    return this.mapQuestion(rows[0]!);
  }

  async listStoreQuestions(storeId: number | null, status?: string): Promise<ProductQuestionRecord[]> {
    const params: unknown[] = [];
    const where = ['q.deleted_at IS NULL'];
    if (storeId !== null) {
      where.push('q.store_id = ?');
      params.push(storeId);
    }
    if (status) {
      where.push('q.status = ?');
      params.push(status);
    }
    const rows = (await dbPool.query(
      `SELECT q.question_id, q.product_id, p.name AS product_name, p.slug AS product_slug,
              q.store_id, q.customer_name, q.question_text, q.answer_text, q.answered_at, q.status, q.created_at
         FROM product_questions q
         JOIN products p ON p.product_id = q.product_id
        WHERE ${where.join(' AND ')}
        ORDER BY CASE WHEN q.status = 'pending' THEN 0 ELSE 1 END, q.created_at DESC
        LIMIT 100`,
      params,
    )) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapQuestion(r));
  }

  async answerQuestion(
    questionId: number,
    storeId: number | null,
    answeredBy: number,
    answerText: string,
  ): Promise<ProductQuestionRecord | null> {
    const params: unknown[] = [answerText, answeredBy, questionId];
    let storeClause = '';
    if (storeId !== null) {
      storeClause = ' AND store_id = ?';
      params.push(storeId);
    }
    const res = (await dbPool.query(
      `UPDATE product_questions
          SET answer_text = ?, answered_by = ?, answered_at = NOW(3), status = 'answered'
        WHERE question_id = ? AND deleted_at IS NULL${storeClause}`,
      params,
    )) as { affectedRows: number };
    if (res.affectedRows === 0) return null;

    const rows = (await dbPool.query(
      `SELECT q.question_id, q.product_id, p.name AS product_name, p.slug AS product_slug,
              q.store_id, q.customer_name, q.question_text, q.answer_text, q.answered_at, q.status, q.created_at
         FROM product_questions q
         JOIN products p ON p.product_id = q.product_id
        WHERE q.question_id = ? LIMIT 1`,
      [questionId],
    )) as Array<Record<string, unknown>>;
    return rows[0] ? this.mapQuestion(rows[0]) : null;
  }

  async listProductReviews(productId: number): Promise<ProductReviewRecord[]> {
    const rows = (await dbPool.query(
      `SELECT review_id, product_id, store_id, order_id, reviewer_name,
              product_rating, seller_rating, title, comment, seller_reply, seller_replied_at,
              is_verified_purchase, created_at
         FROM product_reviews
        WHERE product_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 50`,
      [productId],
    )) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapReview(r));
  }

  async createVerifiedReview(input: {
    product_id: number;
    order_number: string;
    contact: string;
    product_rating: number;
    seller_rating: number;
    title: string | null;
    comment: string;
  }): Promise<ProductReviewRecord> {
    const reviewId = await withTransaction(async (conn) => {
      const normalizedContact = input.contact.trim().toLowerCase();
      const orderRows = (await conn.query(
        `SELECT o.order_id, o.store_id, o.customer_id, c.full_name, c.email, c.phone
           FROM orders o
           JOIN customers c ON c.customer_id = o.customer_id
           JOIN order_items oi ON oi.order_id = o.order_id
          WHERE o.order_number = ?
            AND o.order_status <> 'cancelado'
            AND oi.product_id = ?
          LIMIT 1`,
        [input.order_number.trim(), input.product_id],
      )) as Array<{
        order_id: number;
        store_id: number;
        customer_id: number;
        full_name: string;
        email: string | null;
        phone: string;
      }>;

      const order = orderRows[0];
      if (!order) {
        throw new NotFoundError('No encontramos ese pedido con el producto seleccionado');
      }

      const emailMatch = order.email?.toLowerCase() === normalizedContact;
      const phoneMatch = order.phone.replace(/\s+/g, '').toLowerCase() === normalizedContact.replace(/\s+/g, '');
      if (!emailMatch && !phoneMatch) {
        throw new ForbiddenError('El correo o teléfono no coincide con el comprador del pedido');
      }

      const existing = (await conn.query(
        `SELECT review_id FROM product_reviews WHERE order_id = ? AND product_id = ? LIMIT 1`,
        [order.order_id, input.product_id],
      )) as { review_id: number }[];
      if (existing[0]) {
        throw new ConflictError('Ya enviaste una reseña para este producto en ese pedido', 'REVIEW_ALREADY_EXISTS');
      }

      const insertRes = (await conn.query(
        `INSERT INTO product_reviews (
           product_id, store_id, order_id, customer_id, reviewer_name,
           product_rating, seller_rating, title, comment, is_verified_purchase
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          input.product_id,
          order.store_id,
          order.order_id,
          order.customer_id,
          order.full_name,
          input.product_rating,
          input.seller_rating,
          input.title,
          input.comment,
        ],
      )) as { insertId: number };

      // Recalcular promedio de producto y tienda en la misma transacción
      await conn.query(
        `UPDATE products
            SET rating_average = (SELECT COALESCE(AVG(product_rating), 0) FROM product_reviews WHERE product_id = ? AND deleted_at IS NULL),
                rating_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = ? AND deleted_at IS NULL)
          WHERE product_id = ?`,
        [input.product_id, input.product_id, input.product_id],
      );

      await conn.query(
        `UPDATE stores
            SET rating_average = (SELECT COALESCE(AVG(seller_rating), 0) FROM product_reviews WHERE store_id = ? AND deleted_at IS NULL),
                rating_count = (SELECT COUNT(*) FROM product_reviews WHERE store_id = ? AND deleted_at IS NULL)
          WHERE store_id = ?`,
        [order.store_id, order.store_id, order.store_id],
      );

      return Number(insertRes.insertId);
    });

    const rows = (await dbPool.query(
      `SELECT review_id, product_id, store_id, order_id, reviewer_name,
              product_rating, seller_rating, title, comment, seller_reply, seller_replied_at,
              is_verified_purchase, created_at
         FROM product_reviews WHERE review_id = ? LIMIT 1`,
      [reviewId],
    )) as Array<Record<string, unknown>>;
    return this.mapReview(rows[0]!);
  }

  async listStoreReviews(storeId: number | null): Promise<ProductReviewRecord[]> {
    const params: unknown[] = [];
    const where = ['r.deleted_at IS NULL'];
    if (storeId !== null) {
      where.push('r.store_id = ?');
      params.push(storeId);
    }
    const rows = (await dbPool.query(
      `SELECT r.review_id, r.product_id, p.name AS product_name, r.store_id, r.order_id, r.reviewer_name,
              r.product_rating, r.seller_rating, r.title, r.comment, r.seller_reply, r.seller_replied_at,
              r.is_verified_purchase, r.created_at
         FROM product_reviews r
         JOIN products p ON p.product_id = r.product_id
        WHERE ${where.join(' AND ')}
        ORDER BY r.created_at DESC
        LIMIT 100`,
      params,
    )) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapReview(r));
  }

  async replyToReview(
    reviewId: number,
    storeId: number | null,
    sellerReply: string,
  ): Promise<ProductReviewRecord | null> {
    const params: unknown[] = [sellerReply, reviewId];
    let storeClause = '';
    if (storeId !== null) {
      storeClause = ' AND store_id = ?';
      params.push(storeId);
    }
    const res = (await dbPool.query(
      `UPDATE product_reviews
          SET seller_reply = ?, seller_replied_at = NOW(3)
        WHERE review_id = ? AND deleted_at IS NULL${storeClause}`,
      params,
    )) as { affectedRows: number };
    if (res.affectedRows === 0) return null;

    const rows = (await dbPool.query(
      `SELECT r.review_id, r.product_id, p.name AS product_name, r.store_id, r.order_id, r.reviewer_name,
              r.product_rating, r.seller_rating, r.title, r.comment, r.seller_reply, r.seller_replied_at,
              r.is_verified_purchase, r.created_at
         FROM product_reviews r
         JOIN products p ON p.product_id = r.product_id
        WHERE r.review_id = ? LIMIT 1`,
      [reviewId],
    )) as Array<Record<string, unknown>>;
    return rows[0] ? this.mapReview(rows[0]) : null;
  }

  async verifyBuyerOrderAccess(
    orderNumber: string,
    contact: string,
  ): Promise<{ order_id: number; store_id: number; customer_name: string } | null> {
    const normalized = contact.trim().toLowerCase();
    const rows = (await dbPool.query(
      `SELECT o.order_id, o.store_id, c.full_name, c.email, c.phone
         FROM orders o
         JOIN customers c ON c.customer_id = o.customer_id
        WHERE o.order_number = ?
        LIMIT 1`,
      [orderNumber.trim()],
    )) as Array<{ order_id: number; store_id: number; full_name: string; email: string | null; phone: string }>;

    const row = rows[0];
    if (!row) return null;
    const emailMatch = row.email?.toLowerCase() === normalized;
    const phoneMatch = row.phone.replace(/\s+/g, '').toLowerCase() === normalized.replace(/\s+/g, '');
    if (!emailMatch && !phoneMatch) {
      throw new ForbiddenError('El contacto no coincide con el comprador del pedido');
    }
    return { order_id: Number(row.order_id), store_id: Number(row.store_id), customer_name: row.full_name };
  }

  async verifySellerOrderAccess(
    orderId: number,
    storeId: number | null,
  ): Promise<{ order_id: number; store_id: number } | null> {
    const params: unknown[] = [orderId];
    let storeClause = '';
    if (storeId !== null) {
      storeClause = ' AND store_id = ?';
      params.push(storeId);
    }
    const rows = (await dbPool.query(
      `SELECT order_id, store_id FROM orders WHERE order_id = ?${storeClause} LIMIT 1`,
      params,
    )) as Array<{ order_id: number; store_id: number }>;
    return rows[0] ? { order_id: Number(rows[0].order_id), store_id: Number(rows[0].store_id) } : null;
  }

  async listOrderMessages(orderId: number): Promise<OrderMessageRecord[]> {
    const rows = (await dbPool.query(
      `SELECT message_id, order_id, store_id, sender_role, sender_name, message_text, is_read, created_at
         FROM order_messages
        WHERE order_id = ?
        ORDER BY created_at ASC`,
      [orderId],
    )) as Array<Record<string, unknown>>;
    return rows.map((r) => this.mapMessage(r));
  }

  async createOrderMessage(input: {
    order_id: number;
    store_id: number;
    sender_role: 'buyer' | 'seller';
    sender_name: string;
    sender_user_id: number | null;
    message_text: string;
  }): Promise<OrderMessageRecord> {
    const res = (await dbPool.query(
      `INSERT INTO order_messages (order_id, store_id, sender_role, sender_name, sender_user_id, message_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.order_id,
        input.store_id,
        input.sender_role,
        input.sender_name,
        input.sender_user_id,
        input.message_text,
      ],
    )) as { insertId: number };

    const rows = (await dbPool.query(
      `SELECT message_id, order_id, store_id, sender_role, sender_name, message_text, is_read, created_at
         FROM order_messages WHERE message_id = ? LIMIT 1`,
      [Number(res.insertId)],
    )) as Array<Record<string, unknown>>;
    return this.mapMessage(rows[0]!);
  }

  async listCustomerOrdersByEmail(email: string) {
    const rows = (await dbPool.query(
      `SELECT o.order_id, o.order_number, o.order_status, o.total_amount, o.currency, o.created_at,
              s.name AS store_name, oi.product_id, oi.product_name_snapshot, oi.quantity
         FROM orders o
         INNER JOIN customers c ON c.customer_id = o.customer_id
         INNER JOIN stores s ON s.store_id = o.store_id
         INNER JOIN order_items oi ON oi.order_id = o.order_id
        WHERE LOWER(c.email) = ?
        ORDER BY o.created_at DESC
        LIMIT 100`,
      [email.trim().toLowerCase()],
    )) as Array<{
      order_id: number;
      order_number: string;
      order_status: string;
      total_amount: string | number;
      currency: string;
      created_at: Date;
      store_name: string;
      product_id: number;
      product_name_snapshot: string;
      quantity: number;
    }>;

    const byOrder = new Map<
      number,
      {
        order_id: number;
        order_number: string;
        order_status: string;
        total_amount: number;
        currency: string;
        store_name: string;
        created_at: string;
        items: Array<{ product_id: number; product_name: string; quantity: number }>;
      }
    >();

    for (const r of rows) {
      const oid = Number(r.order_id);
      let entry = byOrder.get(oid);
      if (!entry) {
        entry = {
          order_id: oid,
          order_number: r.order_number,
          order_status: r.order_status,
          total_amount: Number(r.total_amount),
          currency: r.currency,
          store_name: r.store_name,
          created_at: new Date(r.created_at).toISOString(),
          items: [],
        };
        byOrder.set(oid, entry);
      }
      entry.items.push({
        product_id: Number(r.product_id),
        product_name: r.product_name_snapshot,
        quantity: Number(r.quantity),
      });
    }

    return Array.from(byOrder.values());
  }

  private mapStore(row: StoreRow): StoreSummary {
    return {
      store_id: Number(row.store_id),
      name: row.name,
      slug: row.slug,
      description: row.description,
      logo_url: row.logo_url,
      banner_url: row.banner_url,
      city: row.city,
      phone: row.phone,
      email: row.email,
      status: row.status,
      rating_average: Number(row.rating_average),
      rating_count: Number(row.rating_count),
      sales_count: Number(row.sales_count),
      response_rate_pct: Number(row.response_rate_pct),
      is_verified: Boolean(row.is_verified),
      products_count: Number(row.products_count ?? 0),
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private mapQuestion(row: Record<string, unknown>): ProductQuestionRecord {
    return {
      question_id: Number(row.question_id),
      product_id: Number(row.product_id),
      product_name: row.product_name ? String(row.product_name) : undefined,
      product_slug: row.product_slug ? String(row.product_slug) : undefined,
      store_id: Number(row.store_id),
      customer_name: String(row.customer_name),
      question_text: String(row.question_text),
      answer_text: row.answer_text ? String(row.answer_text) : null,
      answered_at: row.answered_at ? new Date(String(row.answered_at)).toISOString() : null,
      status: row.status as ProductQuestionRecord['status'],
      created_at: new Date(String(row.created_at)).toISOString(),
    };
  }

  private mapReview(row: Record<string, unknown>): ProductReviewRecord {
    return {
      review_id: Number(row.review_id),
      product_id: Number(row.product_id),
      product_name: row.product_name ? String(row.product_name) : undefined,
      store_id: Number(row.store_id),
      order_id: Number(row.order_id),
      reviewer_name: String(row.reviewer_name),
      product_rating: Number(row.product_rating),
      seller_rating: Number(row.seller_rating),
      title: row.title ? String(row.title) : null,
      comment: String(row.comment),
      seller_reply: row.seller_reply ? String(row.seller_reply) : null,
      seller_replied_at: row.seller_replied_at ? new Date(String(row.seller_replied_at)).toISOString() : null,
      is_verified_purchase: Boolean(row.is_verified_purchase),
      created_at: new Date(String(row.created_at)).toISOString(),
    };
  }

  private mapMessage(row: Record<string, unknown>): OrderMessageRecord {
    return {
      message_id: Number(row.message_id),
      order_id: Number(row.order_id),
      store_id: Number(row.store_id),
      sender_role: row.sender_role as 'buyer' | 'seller',
      sender_name: String(row.sender_name),
      message_text: String(row.message_text),
      is_read: Boolean(row.is_read),
      created_at: new Date(String(row.created_at)).toISOString(),
    };
  }
}
