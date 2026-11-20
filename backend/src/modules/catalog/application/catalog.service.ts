import { NotFoundError } from '../../../shared/domain/app-error.js';
import type {
  CatalogRepositoryPort,
  CreateProductInput,
  ProductLine,
  StoreProductQuery,
  UpdateProductInput,
  UpsertCategoryInput,
} from '../domain/catalog.repository.js';

export class CatalogService {
  constructor(private readonly catalogRepo: CatalogRepositoryPort) {}

  listStoreCategories(featuredOnly?: boolean) {
    return this.catalogRepo.listStoreCategories(featuredOnly);
  }

  listCrmCategories() {
    return this.catalogRepo.listCrmCategories();
  }

  createCategory(input: UpsertCategoryInput) {
    return this.catalogRepo.createCategory(input);
  }

  async updateCategory(categoryId: number, input: UpsertCategoryInput) {
    const updated = await this.catalogRepo.updateCategory(categoryId, input);
    if (!updated) throw new NotFoundError(`Categoría ${categoryId} no encontrada`);
    return updated;
  }

  listStoreProducts(query: StoreProductQuery) {
    return this.catalogRepo.listStoreProducts(query);
  }

  listTrendingSearches(limit: number) {
    return this.catalogRepo.listTrendingSearches(limit);
  }

  async getStoreProductBySlug(slug: string) {
    const product = await this.catalogRepo.findStoreProductBySlug(slug);
    if (!product) throw new NotFoundError(`Producto '${slug}' no encontrado`);
    return product;
  }

  listCrmProducts(params: {
    store_id?: number | null;
    q?: string | undefined;
    product_line?: ProductLine | undefined;
    low_stock_only?: boolean | undefined;
    page: number;
    page_size: number;
  }) {
    return this.catalogRepo.listCrmProducts(params);
  }

  createProduct(input: CreateProductInput, actorUserId: number) {
    return this.catalogRepo.createProduct(input, actorUserId);
  }

  async updateProduct(productId: number, input: UpdateProductInput, storeId?: number | null) {
    const updated = await this.catalogRepo.updateProduct(productId, input, storeId);
    if (!updated) throw new NotFoundError(`Producto ${productId} no encontrado`);
    return updated;
  }

  async updateProductStatus(productId: number, isActive: boolean, storeId?: number | null) {
    const updated = await this.catalogRepo.updateProductStatus(productId, isActive, storeId);
    if (!updated) throw new NotFoundError(`Producto ${productId} no encontrado`);
    return updated;
  }
}
