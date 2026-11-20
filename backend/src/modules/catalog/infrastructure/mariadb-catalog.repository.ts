import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { dbPool, withTransaction } from '../../../shared/infrastructure/database/pool.js';
import { computePopularityScore, normalizeSearchTerm } from '../domain/popularity-score.js';
import type {
  CatalogRepositoryPort,
  CategoryEntity,
  CreateProductInput,
  CrmProductItem,
  ProductLine,
  StoreProductDetail,
  StoreProductQuery,
  StoreProductSummary,
  TrendingSearchTerm,
  UpdateProductInput,
  UpsertCategoryInput,
} from '../domain/catalog.repository.js';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

const CATEGORY_SLUG_MAP: Record<string, string> = {
  'compresores-ac': 'Compresores A/C',
  'condensadores-evaporadores': 'Condensadores y Evaporadores',
  'gases-aceites-refrigerantes': 'Gases y Aceites Refrigerantes',
  'filtros-valvulas-ac': 'Filtros y Válvulas A/C',
  'iluminacion-led': 'Iluminación LED Automotriz',
  'accesorios-cuidado': 'Cuidado Automotriz',
};

function getCategorySlug(categoryName: string): string {
  for (const [slug, name] of Object.entries(CATEGORY_SLUG_MAP)) {
    if (name.toLowerCase() === categoryName.toLowerCase()) {
      return slug;
    }
  }
  return slugify(categoryName);
}

function getProductLine(categoryName: string): ProductLine {
  const lower = categoryName.toLowerCase();
  if (lower.includes('accesorio') || lower.includes('iluminaci') || lower.includes('cuidado') || lower.includes('led')) {
    return 'variados_vehiculos';
  }
  return 'refrigeracion_vehicular';
}

interface SvaCategoryRow {
  id: number;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  imagen: string | null;
  estado: string;
  active_products_count?: number;
}

interface SvaProductRow {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  categoria_nombre?: string;
  talla: string | null;
  color: string | null;
  imagen: string | null;
  costo_usd: number;
  porcentaje_utilidad: number;
  porcentaje_iva: number;
  precio_usd: number;
  stock_actual: number;
  stock_minimo: number;
  estado: string;
  created_at: Date;
}

const POPULARITY_SQL =
  '((COALESCE(sales_agg.sold_count, 0) * 3.0 + COALESCE(p.search_count, 0) * 1.2 + p.rating_average * LN(1 + p.rating_count) * 0.8 + (CASE WHEN p.is_featured = 1 THEN 5 ELSE 0 END)) * (CASE WHEN p.stock_quantity > 0 THEN 1 ELSE 0.35 END))';

const SALES_AGG_JOIN = `LEFT JOIN (
  SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0) AS sold_count
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
   WHERE o.order_status <> 'cancelado'
   GROUP BY oi.product_id
) sales_agg ON sales_agg.product_id = p.product_id`;

export class MariaDbCatalogRepository implements CatalogRepositoryPort {
  async listStoreCategories(_featuredOnly?: boolean): Promise<readonly CategoryEntity[]> {
    const rows = (await dbPool.query(
      `SELECT c.id, c.nombre, c.descripcion, c.icono, NULL AS imagen, c.estado,
              COUNT(p.id) AS active_products_count
         FROM categorias c
         LEFT JOIN productos p ON p.categoria_id = c.id AND p.estado = 'activo'
        WHERE c.estado = 'activo'
        GROUP BY c.id
        ORDER BY c.id ASC`,
    )) as SvaCategoryRow[];

    return rows.map((r) => this.mapCategory(r));
  }

  async listCrmCategories(): Promise<readonly CategoryEntity[]> {
    const rows = (await dbPool.query(
      `SELECT c.id, c.nombre, c.descripcion, c.icono, NULL AS imagen, c.estado,
              COUNT(p.id) AS active_products_count
         FROM categorias c
         LEFT JOIN productos p ON p.categoria_id = c.id
        GROUP BY c.id
        ORDER BY c.id ASC`,
    )) as SvaCategoryRow[];

    return rows.map((r) => this.mapCategory(r));
  }

  async createCategory(input: UpsertCategoryInput): Promise<CategoryEntity> {
    const res = (await dbPool.query(
      `INSERT INTO categorias (nombre, prefijo, descripcion, estado)
       VALUES (?, ?, ?, ?)`,
      [
        input.name,
        input.name.slice(0, 3).toUpperCase(),
        input.description,
        input.is_active ? 'activo' : 'inactivo',
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
      `UPDATE categorias
          SET nombre = ?, descripcion = ?, estado = ?
        WHERE id = ?`,
      [
        input.name,
        input.description,
        input.is_active ? 'activo' : 'inactivo',
        categoryId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findCategoryById(categoryId);
  }

  async listStoreProducts(query: StoreProductQuery): Promise<PaginatedData<StoreProductSummary>> {
    const conditions: string[] = ["p.estado = 'activo'", "c.estado = 'activo'"];
    const params: unknown[] = [];

    if (query.q) {
      conditions.push('(p.nombre LIKE ? OR p.codigo LIKE ? OR p.descripcion LIKE ? OR p.talla LIKE ?)');
      const like = `%${query.q}%`;
      params.push(like, like, like, like);
    }
    if (query.category_slug) {
      const mappedName = CATEGORY_SLUG_MAP[query.category_slug];
      if (mappedName) {
        conditions.push('c.nombre = ?');
        params.push(mappedName);
      } else {
        conditions.push('(LOWER(REPLACE(c.nombre, " ", "-")) = ? OR c.nombre LIKE ?)');
        params.push(query.category_slug, `%${query.category_slug}%`);
      }
    }
    if (query.in_stock) {
      conditions.push('p.stock_actual > 0');
    }
    if (query.min_price !== undefined) {
      conditions.push('p.precio_usd >= ?');
      params.push(query.min_price);
    }
    if (query.max_price !== undefined) {
      conditions.push('p.precio_usd <= ?');
      params.push(query.max_price);
    }

    const whereClause = conditions.join(' AND ');
    const orderByMap: Record<StoreProductQuery['sort'], string> = {
      featured: 'p.stock_actual DESC, p.id DESC',
      popular: 'p.stock_actual DESC, p.id DESC',
      bestsellers: 'p.stock_actual DESC, p.id DESC',
      most_searched: 'p.stock_actual DESC, p.id DESC',
      price_asc: 'p.precio_usd ASC',
      price_desc: 'p.precio_usd DESC',
      newest: 'p.id DESC',
      rating_desc: 'p.stock_actual DESC',
    };
    const orderBy = orderByMap[query.sort] || 'p.id DESC';
    const offset = (query.page - 1) * query.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total
         FROM productos p
         INNER JOIN categorias c ON c.id = p.categoria_id
        WHERE ${whereClause}`,
      params,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
         FROM productos p
         INNER JOIN categorias c ON c.id = p.categoria_id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
      [...params, query.page_size, offset],
    )) as SvaProductRow[];

    const normalizedTerm = query.page === 1 ? normalizeSearchTerm(query.q) : null;
    if (normalizedTerm) {
      await this.recordSearchSignals(
        normalizedTerm,
        rows.map((r) => Number(r.id)),
      );
    }

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

  async listTrendingSearches(limit: number): Promise<readonly TrendingSearchTerm[]> {
    try {
      const rows = (await dbPool.query(
        `SELECT term, search_count
           FROM product_search_terms
          ORDER BY search_count DESC, last_searched_at DESC
          LIMIT ?`,
        [limit],
      )) as { term: string; search_count: number }[];
      return rows.map((r) => ({
        term: r.term,
        search_count: Number(r.search_count),
      }));
    } catch {
      return [];
    }
  }

  private async recordSearchSignals(term: string, productIds: readonly number[]): Promise<void> {
    try {
      await dbPool.query(
        `INSERT INTO product_search_terms (term, search_count)
         VALUES (?, 1)
         ON DUPLICATE KEY UPDATE search_count = search_count + 1, last_searched_at = CURRENT_TIMESTAMP`,
        [term],
      );
      if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(', ');
        await dbPool.query(
          `UPDATE products
              SET search_count = search_count + 1
            WHERE product_id IN (${placeholders}) AND deleted_at IS NULL`,
          [...productIds],
        );
      }
    } catch {
      // Telemetría de búsqueda: no bloquea la respuesta del catálogo si la migración aún no se aplicó
    }
  }

  async findStoreProductBySlug(slug: string): Promise<StoreProductDetail | null> {
    const rows = (await dbPool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
         FROM productos p
         INNER JOIN categorias c ON c.id = p.categoria_id
        WHERE (p.codigo = ? OR LOWER(p.nombre) LIKE ? OR p.id = ?)
          AND p.estado = 'activo'
        LIMIT 1`,
      [slug.toUpperCase(), `%${slug.replace(/-/g, ' ')}%`, Number(slug) || 0],
    )) as SvaProductRow[];

    const row = rows[0];
    if (!row) return null;

    const summary = this.mapStoreSummary(row);
    const imageUrl = summary.thumbnail_url ?? '/media/products/compresor-ac.jpg';

    return {
      ...summary,
      short_description: row.descripcion ?? row.nombre,
      description: row.descripcion ?? row.nombre,
      technical_specs: {
        compatibilidad: row.talla ?? 'Universal',
        marca: row.color ?? 'OEM',
        garantia: 'Garantía certificada de fábrica',
      },
      store: {
        store_id: 1,
        name: 'NEXORA Oficial',
        slug: 'nexora-oficial',
        city: 'Valencia',
        rating_average: 4.9,
        rating_count: 24,
        sales_count: 58,
        response_rate_pct: 98,
        is_verified: true,
      },
      images: [
        {
          product_image_id: 1,
          image_url: imageUrl,
          image_alt: row.nombre,
          display_order: 1,
          is_primary: true,
        },
      ],
    };
  }

  async listCrmProducts(params: {
    store_id?: number | null;
    q?: string | undefined;
    product_line?: ProductLine | undefined;
    low_stock_only?: boolean | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CrmProductItem>> {
    const conditions: string[] = ['1 = 1'];
    const sqlParams: unknown[] = [];

    if (params.store_id !== undefined && params.store_id !== null) {
      conditions.push('p.store_id = ?');
      sqlParams.push(params.store_id);
    }
    if (params.q) {
      conditions.push('(p.nombre LIKE ? OR p.codigo LIKE ?)');
      const like = `%${params.q}%`;
      sqlParams.push(like, like);
    }
    if (params.low_stock_only) {
      conditions.push('p.stock_actual <= p.stock_minimo');
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total FROM productos p WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
         FROM productos p
         LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE ${whereClause}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?`,
      [...sqlParams, params.page_size, offset],
    )) as SvaProductRow[];

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

  async createProduct(input: CreateProductInput, _actorUserId: number): Promise<CrmProductItem> {
    const gallery = (input.gallery_urls ?? []).filter((u) => u.trim().length > 0);
    const primaryThumbnail = input.thumbnail_url ?? gallery[0] ?? null;

    const productId = await withTransaction(async (conn) => {
      const res = (await conn.query(
        `INSERT INTO productos
          (codigo, nombre, descripcion, categoria_id, talla, color, imagen,
           costo_usd, porcentaje_utilidad, porcentaje_iva, precio_usd, stock_actual, stock_minimo, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.sku,
          input.name,
          input.description ?? input.short_description,
          input.category_id,
          input.vehicle_compatibility ?? 'Universal',
          input.brand ?? 'OEM',
          primaryThumbnail,
          input.cost_price,
          input.profit_margin_pct,
          input.tax_rate_pct,
          input.sale_price,
          input.stock_quantity,
          input.min_stock_threshold,
          input.is_active ? 'activo' : 'inactivo',
        ],
      )) as { insertId: number };

      const newId = Number(res.insertId);
      if (input.stock_quantity > 0) {
        await conn.query(
          `INSERT INTO productos_depositos (producto_id, deposito_id, stock_actual)
           VALUES (?, 1, ?)`,
          [newId, input.stock_quantity],
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
    _storeId?: number | null,
  ): Promise<CrmProductItem | null> {
    const gallery = input.gallery_urls ? input.gallery_urls.filter((u) => u.trim().length > 0) : undefined;
    const primaryThumbnail = input.thumbnail_url ?? gallery?.[0] ?? null;

    const res = (await dbPool.query(
      `UPDATE productos
          SET categoria_id = ?, codigo = ?, nombre = ?, descripcion = ?,
              talla = ?, color = ?, imagen = ?, costo_usd = ?,
              porcentaje_utilidad = ?, porcentaje_iva = ?, precio_usd = ?,
              stock_minimo = ?, estado = ?
        WHERE id = ?`,
      [
        input.category_id,
        input.sku,
        input.name,
        input.description ?? input.short_description,
        input.vehicle_compatibility,
        input.brand,
        primaryThumbnail,
        input.cost_price,
        input.profit_margin_pct,
        input.tax_rate_pct,
        input.sale_price,
        input.min_stock_threshold,
        input.is_active ? 'activo' : 'inactivo',
        productId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findCrmProductById(productId);
  }

  async updateProductStatus(
    productId: number,
    isActive: boolean,
    _storeId?: number | null,
  ): Promise<CrmProductItem | null> {
    const res = (await dbPool.query(
      `UPDATE productos SET estado = ? WHERE id = ?`,
      [isActive ? 'activo' : 'inactivo', productId],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findCrmProductById(productId);
  }

  private async findCategoryById(categoryId: number): Promise<CategoryEntity | null> {
    const rows = (await dbPool.query(
      `SELECT c.id, c.nombre, c.descripcion, c.icono, NULL AS imagen, c.estado,
              COUNT(p.id) AS active_products_count
         FROM categorias c
         LEFT JOIN productos p ON p.categoria_id = c.id
        WHERE c.id = ?
        GROUP BY c.id`,
      [categoryId],
    )) as SvaCategoryRow[];
    const row = rows[0];
    return row ? this.mapCategory(row) : null;
  }

  private async findCrmProductById(productId: number): Promise<CrmProductItem | null> {
    const rows = (await dbPool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
         FROM productos p
         LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.id = ?
        LIMIT 1`,
      [productId],
    )) as SvaProductRow[];
    const row = rows[0];
    return row ? this.mapCrmProduct(row) : null;
  }

  private async fetchGalleryMap(productIds: readonly number[]): Promise<Map<number, string[]>> {
    const map = new Map<number, string[]>();
    if (productIds.length === 0) return map;
    const placeholders = productIds.map(() => '?').join(', ');
    const rows = (await dbPool.query(
      `SELECT product_id, image_url
         FROM product_images
        WHERE product_id IN (${placeholders}) AND deleted_at IS NULL
        ORDER BY is_primary DESC, display_order ASC`,
      [...productIds],
    )) as { product_id: number; image_url: string }[];
    for (const r of rows) {
      const pid = Number(r.product_id);
      const list = map.get(pid) ?? [];
      list.push(r.image_url);
      map.set(pid, list);
    }
    return map;
  }

  private mapCategory(r: SvaCategoryRow): CategoryEntity {
    const catName = r.nombre;
    return {
      category_id: Number(r.id),
      parent_id: null,
      name: catName,
      slug: getCategorySlug(catName),
      subtitle: r.descripcion,
      description: r.descripcion,
      image_url: r.imagen,
      product_line: getProductLine(catName),
      display_order: Number(r.id),
      is_featured: true,
      is_active: r.estado === 'activo',
      active_products_count: Number(r.active_products_count ?? 0),
    };
  }

  private mapStoreSummary(r: SvaProductRow): StoreProductSummary {
    const stock = Number(r.stock_actual);
    const catName = r.categoria_nombre ?? 'General';
    const inStock = stock > 0;
    return {
      product_id: Number(r.id),
      store_id: 1,
      store_name: 'NEXORA Oficial',
      store_slug: 'nexora-oficial',
      sku: r.codigo,
      oem_code: r.codigo.startsWith('AC-') ? r.codigo : null,
      name: r.nombre,
      slug: slugify(r.nombre),
      category_id: Number(r.categoria_id),
      category_name: catName,
      product_line: getProductLine(catName),
      brand: r.color || 'OEM',
      vehicle_compatibility: r.talla || 'Universal',
      price: Number(r.precio_usd),
      compare_at_price: null,
      currency: 'USD',
      stock_quantity: stock,
      in_stock: inStock,
      rating_average: 4.9,
      rating_count: 24,
      thumbnail_url: r.imagen,
      is_featured: true,
      sold_count: 0,
      search_count: 0,
      popularity_score: computePopularityScore({
        soldCount: 0,
        searchCount: 0,
        ratingAverage: 4.9,
        ratingCount: 24,
        isFeatured: true,
        inStock,
      }),
    };
  }

  private mapCrmProduct(r: SvaProductRow, galleryUrls: readonly string[] = []): CrmProductItem {
    const summary = this.mapStoreSummary(r);
    const minStock = Number(r.stock_minimo);
    return {
      ...summary,
      model_name: null,
      description: r.descripcion ?? null,
      cost_price: Number(r.costo_usd),
      profit_margin_pct: Number(r.porcentaje_utilidad ?? 0),
      tax_rate_pct: Number(r.porcentaje_iva ?? 0),
      min_stock_threshold: minStock,
      is_active: r.estado === 'activo',
      is_low_stock: summary.stock_quantity <= minStock,
      gallery_urls: galleryUrls.length > 0 ? galleryUrls : r.imagen ? [r.imagen] : [],
    };
  }
}
