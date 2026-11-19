import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { dbPool, withTransaction } from '../../../shared/infrastructure/database/pool.js';
import type {
  CatalogRepositoryPort,
  CategoryEntity,
  CreateProductInput,
  CrmProductItem,
  ProductLine,
  StoreProductDetail,
  StoreProductQuery,
  StoreProductSummary,
  UpdateProductInput,
  UpsertCategoryInput,
} from '../domain/catalog.repository.js';

interface CategoryRow {
  category_id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  product_line: ProductLine;
  display_order: number;
  is_featured: number;
  is_active: number;
  active_products_count: number;
}

interface ProductRow {
  product_id: number;
  sku: string;
  oem_code: string | null;
  name: string;
  slug: string;
  category_id: number;
  category_name: string;
  product_line: ProductLine;
  brand: string | null;
  model_name: string | null;
  vehicle_compatibility: string | null;
  short_description: string | null;
  description: string | null;
  technical_specs: string | null;
  cost_price: number;
  profit_margin_pct: number;
  tax_rate_pct: number;
  sale_price: number;
  compare_at_price: number | null;
  currency: string;
  stock_quantity: number;
  min_stock_threshold: number;
  rating_average: number;
  rating_count: number;
  thumbnail_url: string | null;
  is_featured: number;
  is_active: number;
}

export class MariaDbCatalogRepository implements CatalogRepositoryPort {
  async listStoreCategories(featuredOnly?: boolean): Promise<readonly CategoryEntity[]> {
    const whereFeatured = featuredOnly ? 'AND c.is_featured = 1' : '';
    const rows = (await dbPool.query(
      `SELECT c.category_id, c.parent_id, c.name, c.slug, c.subtitle, c.description,
              c.image_url, c.product_line, c.display_order, c.is_featured, c.is_active,
              COUNT(p.product_id) AS active_products_count
         FROM categories c
         LEFT JOIN products p
           ON p.category_id = c.category_id AND p.is_active = 1 AND p.deleted_at IS NULL
        WHERE c.deleted_at IS NULL AND c.is_active = 1 ${whereFeatured}
        GROUP BY c.category_id
        ORDER BY c.display_order ASC, c.name ASC`,
    )) as CategoryRow[];

    return rows.map((r) => this.mapCategory(r));
  }

  async listCrmCategories(): Promise<readonly CategoryEntity[]> {
    const rows = (await dbPool.query(
      `SELECT c.category_id, c.parent_id, c.name, c.slug, c.subtitle, c.description,
              c.image_url, c.product_line, c.display_order, c.is_featured, c.is_active,
              COUNT(p.product_id) AS active_products_count
         FROM categories c
         LEFT JOIN products p
           ON p.category_id = c.category_id AND p.deleted_at IS NULL
        WHERE c.deleted_at IS NULL
        GROUP BY c.category_id
        ORDER BY c.display_order ASC, c.name ASC`,
    )) as CategoryRow[];

    return rows.map((r) => this.mapCategory(r));
  }

  async createCategory(input: UpsertCategoryInput): Promise<CategoryEntity> {
    const res = (await dbPool.query(
      `INSERT INTO categories
        (parent_id, name, slug, subtitle, description, image_url, product_line,
         display_order, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.parent_id,
        input.name,
        input.slug,
        input.subtitle,
        input.description,
        input.image_url,
        input.product_line,
        input.display_order,
        input.is_featured ? 1 : 0,
        input.is_active ? 1 : 0,
      ],
    )) as { insertId: number };

    const found = await this.findCategoryById(Number(res.insertId));
    if (!found) throw new Error('Invariant broken: categoría creada no encontrada');
    return found;
  }

  async updateCategory(
    categoryId: number,
    input: UpsertCategoryInput,
  ): Promise<CategoryEntity | null> {
    const res = (await dbPool.query(
      `UPDATE categories
          SET parent_id = ?, name = ?, slug = ?, subtitle = ?, description = ?,
              image_url = ?, product_line = ?, display_order = ?, is_featured = ?, is_active = ?
        WHERE category_id = ? AND deleted_at IS NULL`,
      [
        input.parent_id,
        input.name,
        input.slug,
        input.subtitle,
        input.description,
        input.image_url,
        input.product_line,
        input.display_order,
        input.is_featured ? 1 : 0,
        input.is_active ? 1 : 0,
        categoryId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findCategoryById(categoryId);
  }

  async listStoreProducts(query: StoreProductQuery): Promise<PaginatedData<StoreProductSummary>> {
    const conditions: string[] = ['p.deleted_at IS NULL', 'p.is_active = 1', 'c.deleted_at IS NULL', 'c.is_active = 1'];
    const params: unknown[] = [];

    if (query.q) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.oem_code LIKE ? OR p.vehicle_compatibility LIKE ?)');
      const like = `%${query.q}%`;
      params.push(like, like, like, like);
    }
    if (query.category_slug) {
      conditions.push('c.slug = ?');
      params.push(query.category_slug);
    }
    if (query.product_line) {
      conditions.push('p.product_line = ?');
      params.push(query.product_line);
    }
    if (query.featured !== undefined) {
      conditions.push('p.is_featured = ?');
      params.push(query.featured ? 1 : 0);
    }
    if (query.in_stock) {
      conditions.push('p.stock_quantity > 0');
    }
    if (query.min_price !== undefined) {
      conditions.push('p.sale_price >= ?');
      params.push(query.min_price);
    }
    if (query.max_price !== undefined) {
      conditions.push('p.sale_price <= ?');
      params.push(query.max_price);
    }

    const whereClause = conditions.join(' AND ');
    const orderByMap: Record<StoreProductQuery['sort'], string> = {
      featured: 'p.is_featured DESC, p.rating_average DESC, p.product_id DESC',
      price_asc: 'p.sale_price ASC',
      price_desc: 'p.sale_price DESC',
      newest: 'p.created_at DESC',
      rating_desc: 'p.rating_average DESC, p.rating_count DESC',
    };
    const orderBy = orderByMap[query.sort];
    const offset = (query.page - 1) * query.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total
         FROM products p
         INNER JOIN categories c ON c.category_id = p.category_id
        WHERE ${whereClause}`,
      params,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT p.*, c.name AS category_name
         FROM products p
         INNER JOIN categories c ON c.category_id = p.category_id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
      [...params, query.page_size, offset],
    )) as ProductRow[];

    return {
      items: rows.map((r) => this.mapStoreSummary(r)),
      pagination: {
        page: query.page,
        page_size: query.page_size,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / query.page_size)),
      },
    };
  }

  async findStoreProductBySlug(slug: string): Promise<StoreProductDetail | null> {
    const rows = (await dbPool.query(
      `SELECT p.*, c.name AS category_name
         FROM products p
         INNER JOIN categories c ON c.category_id = p.category_id
        WHERE p.slug = ? AND p.deleted_at IS NULL AND p.is_active = 1
        LIMIT 1`,
      [slug],
    )) as ProductRow[];

    const row = rows[0];
    if (!row) return null;

    const images = (await dbPool.query(
      `SELECT product_image_id, image_url, image_alt, display_order, is_primary
         FROM product_images
        WHERE product_id = ? AND deleted_at IS NULL
        ORDER BY is_primary DESC, display_order ASC`,
      [row.product_id],
    )) as {
      product_image_id: number;
      image_url: string;
      image_alt: string;
      display_order: number;
      is_primary: number;
    }[];

    return {
      ...this.mapStoreSummary(row),
      short_description: row.short_description,
      description: row.description,
      technical_specs: row.technical_specs
        ? (JSON.parse(row.technical_specs) as Record<string, unknown>)
        : null,
      images: images.map((img) => ({
        product_image_id: Number(img.product_image_id),
        image_url: img.image_url,
        image_alt: img.image_alt,
        display_order: Number(img.display_order),
        is_primary: Boolean(img.is_primary),
      })),
    };
  }

  async listCrmProducts(params: {
    q?: string | undefined;
    product_line?: ProductLine | undefined;
    low_stock_only?: boolean | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CrmProductItem>> {
    const conditions: string[] = ['p.deleted_at IS NULL'];
    const sqlParams: unknown[] = [];

    if (params.q) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.oem_code LIKE ?)');
      const like = `%${params.q}%`;
      sqlParams.push(like, like, like);
    }
    if (params.product_line) {
      conditions.push('p.product_line = ?');
      sqlParams.push(params.product_line);
    }
    if (params.low_stock_only) {
      conditions.push('p.stock_quantity <= p.min_stock_threshold');
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT p.*, c.name AS category_name
         FROM products p
         INNER JOIN categories c ON c.category_id = p.category_id
        WHERE ${whereClause}
        ORDER BY p.updated_at DESC, p.product_id DESC
        LIMIT ? OFFSET ?`,
      [...sqlParams, params.page_size, offset],
    )) as ProductRow[];

    return {
      items: rows.map((r) => this.mapCrmProduct(r)),
      pagination: {
        page: params.page,
        page_size: params.page_size,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / params.page_size)),
      },
    };
  }

  async createProduct(input: CreateProductInput, actorUserId: number): Promise<CrmProductItem> {
    const productId = await withTransaction(async (conn) => {
      const res = (await conn.query(
        `INSERT INTO products
          (category_id, sku, oem_code, name, slug, product_line, brand, model_name, vehicle_compatibility,
           short_description, description, technical_specs, cost_price, profit_margin_pct, tax_rate_pct,
           sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, thumbnail_url,
           is_featured, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.category_id,
          input.sku,
          input.oem_code,
          input.name,
          input.slug,
          input.product_line,
          input.brand,
          input.model_name,
          input.vehicle_compatibility,
          input.short_description,
          input.description,
          input.technical_specs ? JSON.stringify(input.technical_specs) : null,
          input.cost_price,
          input.profit_margin_pct,
          input.tax_rate_pct,
          input.sale_price,
          input.compare_at_price,
          input.currency,
          input.stock_quantity,
          input.min_stock_threshold,
          input.thumbnail_url,
          input.is_featured ? 1 : 0,
          input.is_active ? 1 : 0,
        ],
      )) as { insertId: number };

      const newId = Number(res.insertId);
      if (input.stock_quantity > 0) {
        await conn.query(
          `INSERT INTO inventory_movements
            (product_id, movement_type, quantity_delta, stock_before, stock_after,
             unit_cost, reference_code, notes, performed_by)
           VALUES (?, 'entrada', ?, 0, ?, ?, 'STOCK-INICIAL', 'Alta inicial de producto en CRM', ?)`,
          [newId, input.stock_quantity, input.stock_quantity, input.cost_price, actorUserId],
        );
      }

      return newId;
    });

    const found = await this.findCrmProductById(productId);
    if (!found) throw new Error('Invariant broken: producto recién creado no encontrado');
    return found;
  }

  async updateProduct(
    productId: number,
    input: UpdateProductInput,
  ): Promise<CrmProductItem | null> {
    const res = (await dbPool.query(
      `UPDATE products
          SET category_id = ?, sku = ?, oem_code = ?, name = ?, slug = ?, product_line = ?,
              brand = ?, model_name = ?, vehicle_compatibility = ?, short_description = ?, description = ?,
              technical_specs = ?, cost_price = ?, profit_margin_pct = ?, tax_rate_pct = ?,
              sale_price = ?, compare_at_price = ?, currency = ?, min_stock_threshold = ?,
              thumbnail_url = ?, is_featured = ?, is_active = ?
        WHERE product_id = ? AND deleted_at IS NULL`,
      [
        input.category_id,
        input.sku,
        input.oem_code,
        input.name,
        input.slug,
        input.product_line,
        input.brand,
        input.model_name,
        input.vehicle_compatibility,
        input.short_description,
        input.description,
        input.technical_specs ? JSON.stringify(input.technical_specs) : null,
        input.cost_price,
        input.profit_margin_pct,
        input.tax_rate_pct,
        input.sale_price,
        input.compare_at_price,
        input.currency,
        input.min_stock_threshold,
        input.thumbnail_url,
        input.is_featured ? 1 : 0,
        input.is_active ? 1 : 0,
        productId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findCrmProductById(productId);
  }

  async updateProductStatus(productId: number, isActive: boolean): Promise<CrmProductItem | null> {
    const res = (await dbPool.query(
      `UPDATE products SET is_active = ? WHERE product_id = ? AND deleted_at IS NULL`,
      [isActive ? 1 : 0, productId],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findCrmProductById(productId);
  }

  private async findCategoryById(categoryId: number): Promise<CategoryEntity | null> {
    const rows = (await dbPool.query(
      `SELECT c.category_id, c.parent_id, c.name, c.slug, c.subtitle, c.description,
              c.image_url, c.product_line, c.display_order, c.is_featured, c.is_active,
              COUNT(p.product_id) AS active_products_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.category_id AND p.deleted_at IS NULL
        WHERE c.category_id = ? AND c.deleted_at IS NULL
        GROUP BY c.category_id`,
      [categoryId],
    )) as CategoryRow[];
    const row = rows[0];
    return row ? this.mapCategory(row) : null;
  }

  private async findCrmProductById(productId: number): Promise<CrmProductItem | null> {
    const rows = (await dbPool.query(
      `SELECT p.*, c.name AS category_name
         FROM products p
         INNER JOIN categories c ON c.category_id = p.category_id
        WHERE p.product_id = ? AND p.deleted_at IS NULL
        LIMIT 1`,
      [productId],
    )) as ProductRow[];
    const row = rows[0];
    return row ? this.mapCrmProduct(row) : null;
  }

  private mapCategory(r: CategoryRow): CategoryEntity {
    return {
      category_id: Number(r.category_id),
      parent_id: r.parent_id === null ? null : Number(r.parent_id),
      name: r.name,
      slug: r.slug,
      subtitle: r.subtitle,
      description: r.description,
      image_url: r.image_url,
      product_line: r.product_line,
      display_order: Number(r.display_order),
      is_featured: Boolean(r.is_featured),
      is_active: Boolean(r.is_active),
      active_products_count: Number(r.active_products_count ?? 0),
    };
  }

  private mapStoreSummary(r: ProductRow): StoreProductSummary {
    const stock = Number(r.stock_quantity);
    return {
      product_id: Number(r.product_id),
      sku: r.sku,
      oem_code: r.oem_code,
      name: r.name,
      slug: r.slug,
      category_id: Number(r.category_id),
      category_name: r.category_name,
      product_line: r.product_line,
      brand: r.brand,
      vehicle_compatibility: r.vehicle_compatibility,
      price: Number(r.sale_price),
      compare_at_price: r.compare_at_price === null ? null : Number(r.compare_at_price),
      currency: r.currency,
      stock_quantity: stock,
      in_stock: stock > 0,
      rating_average: Number(r.rating_average),
      rating_count: Number(r.rating_count),
      thumbnail_url: r.thumbnail_url,
      is_featured: Boolean(r.is_featured),
    };
  }

  private mapCrmProduct(r: ProductRow): CrmProductItem {
    const summary = this.mapStoreSummary(r);
    const minStock = Number(r.min_stock_threshold);
    return {
      ...summary,
      model_name: r.model_name ?? null,
      description: r.description ?? null,
      cost_price: Number(r.cost_price),
      profit_margin_pct: Number(r.profit_margin_pct ?? 0),
      tax_rate_pct: Number(r.tax_rate_pct ?? 0),
      min_stock_threshold: minStock,
      is_active: Boolean(r.is_active),
      is_low_stock: summary.stock_quantity <= minStock,
    };
  }
}
