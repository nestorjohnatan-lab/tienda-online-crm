import crypto from 'node:crypto';
import type { PoolConnection } from 'mariadb';
import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/app-error.js';
import { dbPool, withTransaction } from '../../../shared/infrastructure/database/pool.js';
import {
  assertValidOrderStatusTransition,
  type CreatedOrderSummary,
  type CreateOrderInTxInput,
  type CrmSaleDetail,
  type CrmSaleListItem,
  type DashboardSummary,
  type OrderStatus,
  type PaymentMethod,
  type SaleRepositoryPort,
  type SalesChannel,
} from '../domain/sale.repository.js';

interface SaleListRow {
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  sales_channel: SalesChannel;
  order_status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: string | null;
  notes: string | null;
  payment_receipt_data: string | null;
  created_at: Date;
}

export class MariaDbSaleRepository implements SaleRepositoryPort {
  async createOrderInTx(
    conn: PoolConnection,
    input: CreateOrderInTxInput,
  ): Promise<CreatedOrderSummary> {
    const customerId = await this.resolveCustomerId(conn, input);

    // Consolidar cantidades si un mismo producto aparece repetido en items
    const aggregated = new Map<number, number>();
    for (const item of input.items) {
      aggregated.set(item.product_id, (aggregated.get(item.product_id) ?? 0) + item.quantity);
    }

    const lockedLines: {
      product_id: number;
      sku: string;
      name: string;
      quantity: number;
      unit_price: number;
      unit_cost: number;
      stock_before: number;
      line_total: number;
      currency: string;
    }[] = [];

    let subtotal = 0;
    let currency = 'USD';

    // Ordenar IDs para evitar deadlocks en locks FOR UPDATE
    const sortedProductIds = [...aggregated.keys()].sort((a, b) => a - b);

    for (const productId of sortedProductIds) {
      const qty = aggregated.get(productId)!;
      const rows = (await conn.query(
        `SELECT product_id, sku, name, sale_price, cost_price, stock_quantity, currency, is_active
           FROM products
          WHERE product_id = ? AND deleted_at IS NULL
          LIMIT 1 FOR UPDATE`,
        [productId],
      )) as {
        product_id: number;
        sku: string;
        name: string;
        sale_price: number;
        cost_price: number;
        stock_quantity: number;
        currency: string;
        is_active: number;
      }[];

      const prod = rows[0];
      if (!prod || !prod.is_active) {
        throw new NotFoundError(`Producto ${productId} no disponible`);
      }

      const stockBefore = Number(prod.stock_quantity);
      if (stockBefore < qty) {
        throw new ConflictError(
          `Stock insuficiente para ${prod.sku} (${prod.name}): disponible ${stockBefore}, solicitado ${qty}`,
          'INSUFFICIENT_STOCK',
        );
      }

      const unitPrice = Number(prod.sale_price);
      const lineTotal = Number((unitPrice * qty).toFixed(2));
      subtotal = Number((subtotal + lineTotal).toFixed(2));
      currency = prod.currency;

      lockedLines.push({
        product_id: Number(prod.product_id),
        sku: prod.sku,
        name: prod.name,
        quantity: qty,
        unit_price: unitPrice,
        unit_cost: Number(prod.cost_price),
        stock_before: stockBefore,
        line_total: lineTotal,
        currency: prod.currency,
      });
    }

    const discount = Math.min(Number(input.discount_amount.toFixed(2)), subtotal);
    const taxAmount = 0;
    const totalAmount = Number((subtotal - discount + taxAmount).toFixed(2));
    const orderNumber = this.generateOrderNumber();

    const orderRes = (await conn.query(
      `INSERT INTO orders
        (order_number, customer_id, assigned_user_id, sales_channel, order_status,
         payment_method, subtotal, tax_amount, discount_amount, total_amount, currency,
         shipping_address, notes, payment_receipt_data)
       VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        customerId,
        input.assigned_user_id,
        input.sales_channel,
        input.payment_method,
        subtotal,
        taxAmount,
        discount,
        totalAmount,
        currency,
        input.shipping_address,
        input.notes,
        input.payment_receipt_data ?? null,
      ],
    )) as { insertId: number };

    const orderId = Number(orderRes.insertId);

    for (const line of lockedLines) {
      await conn.query(
        `INSERT INTO order_items
          (order_id, product_id, sku_snapshot, product_name_snapshot, quantity,
           unit_price, unit_cost_snapshot, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          line.product_id,
          line.sku,
          line.name,
          line.quantity,
          line.unit_price,
          line.unit_cost,
          line.line_total,
        ],
      );

      const stockAfter = line.stock_before - line.quantity;
      await conn.query(`UPDATE products SET stock_quantity = ? WHERE product_id = ?`, [
        stockAfter,
        line.product_id,
      ]);

      await conn.query(
        `INSERT INTO inventory_movements
          (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after,
           unit_cost, reference_code, notes, performed_by)
         VALUES (?, ?, 'salida_venta', ?, ?, ?, ?, ?, ?, ?)`,
        [
          line.product_id,
          orderId,
          -line.quantity,
          line.stock_before,
          stockAfter,
          line.unit_cost,
          orderNumber,
          `Descuento automático por venta ${orderNumber}`,
          input.assigned_user_id,
        ],
      );
    }

    return {
      order_id: orderId,
      order_number: orderNumber,
      order_status: 'pendiente',
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discount,
      total_amount: totalAmount,
      currency,
      created_at: new Date().toISOString(),
    };
  }

  async listSales(params: {
    order_status?: OrderStatus | undefined;
    sales_channel?: SalesChannel | undefined;
    q?: string | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CrmSaleListItem>> {
    const conditions: string[] = ['1 = 1'];
    const sqlParams: unknown[] = [];

    if (params.order_status) {
      conditions.push('o.order_status = ?');
      sqlParams.push(params.order_status);
    }
    if (params.sales_channel) {
      conditions.push('o.sales_channel = ?');
      sqlParams.push(params.sales_channel);
    }
    if (params.q) {
      conditions.push('(o.order_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)');
      const like = `%${params.q}%`;
      sqlParams.push(like, like, like);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total
         FROM orders o
         INNER JOIN customers c ON c.customer_id = o.customer_id
        WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT o.*, c.full_name AS customer_name
         FROM orders o
         INNER JOIN customers c ON c.customer_id = o.customer_id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC, o.order_id DESC
        LIMIT ? OFFSET ?`,
      [...sqlParams, params.page_size, offset],
    )) as SaleListRow[];

    return {
      items: rows.map((r) => this.mapListItem(r)),
      pagination: {
        page: params.page,
        page_size: params.page_size,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / params.page_size)),
      },
    };
  }

  async findSaleById(orderId: number): Promise<CrmSaleDetail | null> {
    const rows = (await dbPool.query(
      `SELECT o.*, c.full_name AS customer_name
         FROM orders o
         INNER JOIN customers c ON c.customer_id = o.customer_id
        WHERE o.order_id = ?
        LIMIT 1`,
      [orderId],
    )) as SaleListRow[];

    const row = rows[0];
    if (!row) return null;

    const items = (await dbPool.query(
      `SELECT order_item_id, product_id, sku_snapshot, product_name_snapshot,
              quantity, unit_price, line_total
         FROM order_items
        WHERE order_id = ?
        ORDER BY order_item_id ASC`,
      [orderId],
    )) as {
      order_item_id: number;
      product_id: number;
      sku_snapshot: string;
      product_name_snapshot: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }[];

    return {
      ...this.mapListItem(row),
      subtotal: Number(row.subtotal),
      tax_amount: Number(row.tax_amount),
      discount_amount: Number(row.discount_amount),
      shipping_address: row.shipping_address,
      notes: row.notes,
      payment_receipt_data: row.payment_receipt_data ?? null,
      items: items.map((i) => ({
        order_item_id: Number(i.order_item_id),
        product_id: Number(i.product_id),
        sku_snapshot: i.sku_snapshot,
        product_name_snapshot: i.product_name_snapshot,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
      })),
    };
  }

  async updateOrderStatus(
    orderId: number,
    nextStatus: OrderStatus,
    actorUserId: number,
  ): Promise<CrmSaleDetail> {
    await withTransaction(async (conn) => {
      const orderRows = (await conn.query(
        `SELECT order_id, order_number, order_status
           FROM orders
          WHERE order_id = ?
          LIMIT 1 FOR UPDATE`,
        [orderId],
      )) as { order_id: number; order_number: string; order_status: OrderStatus }[];

      const order = orderRows[0];
      if (!order) {
        throw new NotFoundError(`Venta ${orderId} no encontrada`);
      }

      assertValidOrderStatusTransition(order.order_status, nextStatus);

      await conn.query(`UPDATE orders SET order_status = ? WHERE order_id = ?`, [
        nextStatus,
        orderId,
      ]);

      // Si se cancela, devolver stock de manera atómica con movimiento de devolución
      if (nextStatus === 'cancelado') {
        const orderItems = (await conn.query(
          `SELECT product_id, quantity, unit_cost_snapshot
             FROM order_items
            WHERE order_id = ?
            ORDER BY product_id ASC`,
          [orderId],
        )) as { product_id: number; quantity: number; unit_cost_snapshot: number }[];

        for (const item of orderItems) {
          const prodRows = (await conn.query(
            `SELECT stock_quantity FROM products WHERE product_id = ? LIMIT 1 FOR UPDATE`,
            [item.product_id],
          )) as { stock_quantity: number }[];

          const stockBefore = Number(prodRows[0]?.stock_quantity ?? 0);
          const qty = Number(item.quantity);
          const stockAfter = stockBefore + qty;

          await conn.query(`UPDATE products SET stock_quantity = ? WHERE product_id = ?`, [
            stockAfter,
            item.product_id,
          ]);

          await conn.query(
            `INSERT INTO inventory_movements
              (product_id, order_id, movement_type, quantity_delta, stock_before, stock_after,
               unit_cost, reference_code, notes, performed_by)
             VALUES (?, ?, 'devolucion', ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.product_id,
              orderId,
              qty,
              stockBefore,
              stockAfter,
              Number(item.unit_cost_snapshot),
              order.order_number,
              `Reversión de stock por cancelación de ${order.order_number}`,
              actorUserId,
            ],
          );
        }
      }
    });

    const updated = await this.findSaleById(orderId);
    if (!updated) throw new Error('Invariant broken: venta actualizada no encontrada');
    return updated;
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [salesStats] = (await dbPool.query(
      `SELECT
          COALESCE(SUM(CASE WHEN order_status <> 'cancelado' THEN total_amount ELSE 0 END), 0) AS total_sales_amount,
          COUNT(*) AS orders_count,
          COALESCE(SUM(CASE WHEN order_status = 'pendiente' THEN 1 ELSE 0 END), 0) AS pending_orders_count
         FROM orders`,
    )) as {
      total_sales_amount: number;
      orders_count: number;
      pending_orders_count: number;
    }[];

    const [lowStockRow] = (await dbPool.query(
      `SELECT COUNT(*) AS cnt
         FROM products
        WHERE deleted_at IS NULL AND is_active = 1 AND stock_quantity <= min_stock_threshold`,
    )) as { cnt: number }[];

    const [bannersRow] = (await dbPool.query(
      `SELECT COUNT(*) AS cnt
         FROM banners
        WHERE deleted_at IS NULL AND is_active = 1`,
    )) as { cnt: number }[];

    const recentRows = (await dbPool.query(
      `SELECT o.*, c.full_name AS customer_name
         FROM orders o
         INNER JOIN customers c ON c.customer_id = o.customer_id
        ORDER BY o.created_at DESC, o.order_id DESC
        LIMIT 5`,
    )) as SaleListRow[];

    return {
      total_sales_amount: Number(salesStats?.total_sales_amount ?? 0),
      orders_count: Number(salesStats?.orders_count ?? 0),
      pending_orders_count: Number(salesStats?.pending_orders_count ?? 0),
      low_stock_products_count: Number(lowStockRow?.cnt ?? 0),
      active_banners_count: Number(bannersRow?.cnt ?? 0),
      recent_orders: recentRows.map((r) => this.mapListItem(r)),
    };
  }

  private async resolveCustomerId(
    conn: PoolConnection,
    input: CreateOrderInTxInput,
  ): Promise<number> {
    if (input.customer_id) {
      const existing = (await conn.query(
        `SELECT customer_id FROM customers WHERE customer_id = ? AND deleted_at IS NULL LIMIT 1`,
        [input.customer_id],
      )) as { customer_id: number }[];
      if (!existing[0]) {
        throw new NotFoundError(`Cliente ${input.customer_id} no encontrado`);
      }
      return Number(existing[0].customer_id);
    }

    if (!input.customer) {
      throw new ValidationError('Debe indicar customer_id o los datos del cliente');
    }

    // Buscar por correo o teléfono si ya existe
    if (input.customer.email) {
      const byEmail = (await conn.query(
        `SELECT customer_id FROM customers WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
        [input.customer.email.toLowerCase()],
      )) as { customer_id: number }[];
      if (byEmail[0]) return Number(byEmail[0].customer_id);
    }

    const inserted = (await conn.query(
      `INSERT INTO customers
        (full_name, email, phone, document_id, shipping_address, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.customer.full_name,
        input.customer.email ? input.customer.email.toLowerCase() : null,
        input.customer.phone,
        input.customer.document_id,
        input.customer.shipping_address,
        input.customer.city,
      ],
    )) as { insertId: number };

    return Number(inserted.insertId);
  }

  private generateOrderNumber(): string {
    const year = new Date().getUTCFullYear();
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${year}-${randomPart}`;
  }

  private mapListItem(r: SaleListRow): CrmSaleListItem {
    return {
      order_id: Number(r.order_id),
      order_number: r.order_number,
      customer_id: Number(r.customer_id),
      customer_name: r.customer_name,
      sales_channel: r.sales_channel,
      order_status: r.order_status,
      payment_method: r.payment_method,
      total_amount: Number(r.total_amount),
      currency: r.currency,
      created_at: new Date(r.created_at).toISOString(),
    };
  }
}
