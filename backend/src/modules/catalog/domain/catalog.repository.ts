import type { PaginatedData } from '../../../shared/contracts/api-response.js';

export type ProductLine = 'refrigeracion_vehicular' | 'variados_vehiculos';

export interface CategoryEntity {
  readonly category_id: number;
  readonly parent_id: number | null;
  readonly name: string;
  readonly slug: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly image_url: string | null;
  readonly product_line: ProductLine;
  readonly display_order: number;
  readonly is_featured: boolean;
  readonly is_active: boolean;
  readonly active_products_count: number;
}

export interface StoreProductSummary {
  readonly product_id: number;
  readonly sku: string;
  readonly oem_code: string | null;
  readonly name: string;
  readonly slug: string;
  readonly category_id: number;
  readonly category_name: string;
  readonly product_line: ProductLine;
  readonly brand: string | null;
  readonly vehicle_compatibility: string | null;
  readonly price: number;
  readonly compare_at_price: number | null;
  readonly currency: string;
  readonly stock_quantity: number;
  readonly in_stock: boolean;
  readonly rating_average: number;
  readonly rating_count: number;
  readonly thumbnail_url: string | null;
  readonly is_featured: boolean;
}

export interface StoreProductDetail extends StoreProductSummary {
  readonly short_description: string | null;
  readonly description: string | null;
  readonly technical_specs: Record<string, unknown> | null;
  readonly images: readonly {
    readonly product_image_id: number;
    readonly image_url: string;
    readonly image_alt: string;
    readonly display_order: number;
    readonly is_primary: boolean;
  }[];
}

export interface CrmProductItem extends StoreProductSummary {
  readonly model_name: string | null;
  readonly description: string | null;
  readonly cost_price: number;
  readonly profit_margin_pct: number;
  readonly tax_rate_pct: number;
  readonly min_stock_threshold: number;
  readonly is_active: boolean;
  readonly is_low_stock: boolean;
}

export interface StoreProductQuery {
  readonly q?: string | undefined;
  readonly category_slug?: string | undefined;
  readonly product_line?: ProductLine | undefined;
  readonly featured?: boolean | undefined;
  readonly in_stock?: boolean | undefined;
  readonly min_price?: number | undefined;
  readonly max_price?: number | undefined;
  readonly sort: 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating_desc';
  readonly page: number;
  readonly page_size: number;
}

export interface UpsertCategoryInput {
  readonly parent_id: number | null;
  readonly name: string;
  readonly slug: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly image_url: string | null;
  readonly product_line: ProductLine;
  readonly display_order: number;
  readonly is_featured: boolean;
  readonly is_active: boolean;
}

export interface CreateProductInput {
  readonly category_id: number;
  readonly sku: string;
  readonly oem_code: string | null;
  readonly name: string;
  readonly slug: string;
  readonly product_line: ProductLine;
  readonly brand: string | null;
  readonly model_name: string | null;
  readonly vehicle_compatibility: string | null;
  readonly short_description: string | null;
  readonly description: string | null;
  readonly technical_specs: Record<string, unknown> | null;
  readonly cost_price: number;
  readonly profit_margin_pct: number;
  readonly tax_rate_pct: number;
  readonly sale_price: number;
  readonly compare_at_price: number | null;
  readonly currency: string;
  readonly stock_quantity: number;
  readonly min_stock_threshold: number;
  readonly thumbnail_url: string | null;
  readonly is_featured: boolean;
  readonly is_active: boolean;
}

export type UpdateProductInput = Omit<CreateProductInput, 'stock_quantity'>;

export interface CatalogRepositoryPort {
  listStoreCategories(featuredOnly?: boolean): Promise<readonly CategoryEntity[]>;
  listCrmCategories(): Promise<readonly CategoryEntity[]>;
  createCategory(input: UpsertCategoryInput): Promise<CategoryEntity>;
  updateCategory(categoryId: number, input: UpsertCategoryInput): Promise<CategoryEntity | null>;

  listStoreProducts(query: StoreProductQuery): Promise<PaginatedData<StoreProductSummary>>;
  findStoreProductBySlug(slug: string): Promise<StoreProductDetail | null>;
  listCrmProducts(params: {
    q?: string | undefined;
    product_line?: ProductLine | undefined;
    low_stock_only?: boolean | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CrmProductItem>>;
  createProduct(input: CreateProductInput, actorUserId: number): Promise<CrmProductItem>;
  updateProduct(productId: number, input: UpdateProductInput): Promise<CrmProductItem | null>;
  updateProductStatus(productId: number, isActive: boolean): Promise<CrmProductItem | null>;
}
