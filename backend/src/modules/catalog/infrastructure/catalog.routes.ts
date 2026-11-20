import { Router } from 'express';
import { z } from 'zod';
import { okResponse } from '../../../shared/contracts/api-response.js';
import {
  requireRoles,
  validateBody,
  validateParams,
  validateQuery,
} from '../../../shared/infrastructure/http/middlewares.js';
import type { CatalogService } from '../application/catalog.service.js';

const productLineEnum = z.enum(['refrigeracion_vehicular', 'variados_vehiculos']);

const storeCategoriesQuery = z.object({
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const storeProductsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category_slug: z.string().trim().max(140).optional(),
  store_slug: z.string().trim().max(160).optional(),
  product_line: productLineEnum.optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  in_stock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  sort: z
    .enum([
      'featured',
      'popular',
      'bestsellers',
      'most_searched',
      'price_asc',
      'price_desc',
      'newest',
      'rating_desc',
    ])
    .default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(48).default(12),
});

const trendingSearchesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

const crmProductsQuery = z.object({
  q: z.string().trim().max(120).optional(),
  product_line: productLineEnum.optional(),
  low_stock_only: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

const upsertCategorySchema = z.object({
  parent_id: z.coerce.number().int().positive().nullable().optional().default(null),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  subtitle: z.string().trim().max(160).nullable().optional().default(null),
  description: z.string().trim().max(2000).nullable().optional().default(null),
  image_url: z.string().trim().max(500).nullable().optional().default(null),
  product_line: productLineEnum,
  display_order: z.coerce.number().int().min(0).default(0),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

const baseProductFields = {
  category_id: z.coerce.number().int().positive(),
  sku: z.string().trim().min(2).max(64),
  oem_code: z.string().trim().max(80).nullable().optional().default(null),
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9-]+$/),
  product_line: productLineEnum,
  brand: z.string().trim().max(100).nullable().optional().default(null),
  model_name: z.string().trim().max(120).nullable().optional().default(null),
  vehicle_compatibility: z.string().trim().max(255).nullable().optional().default(null),
  short_description: z.string().trim().max(300).nullable().optional().default(null),
  description: z.string().trim().max(5000).nullable().optional().default(null),
  technical_specs: z.record(z.unknown()).nullable().optional().default(null),
  cost_price: z.coerce.number().min(0).default(0),
  profit_margin_pct: z.coerce.number().min(0).max(999.99).default(0),
  tax_rate_pct: z.coerce.number().min(0).max(100).default(0),
  sale_price: z.coerce.number().min(0),
  compare_at_price: z.coerce.number().min(0).nullable().optional().default(null),
  currency: z.string().trim().length(3).default('USD'),
  min_stock_threshold: z.coerce.number().int().min(0).default(5),
  thumbnail_url: z.string().trim().max(500).nullable().optional().default(null),
  gallery_urls: z.array(z.string().trim().min(1).max(500)).max(8).optional().default([]),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
};

const createProductSchema = z.object({
  ...baseProductFields,
  stock_quantity: z.coerce.number().int().min(0).default(0),
});

const updateProductSchema = z.object(baseProductFields);

const idParam = (key: string) => z.object({ [key]: z.coerce.number().int().positive() });

export function createStoreCatalogRouter(catalogService: CatalogService): Router {
  const router = Router();

  router.get('/categories', validateQuery(storeCategoriesQuery), async (req, res, next) => {
    try {
      const featured = req.query.featured as boolean | undefined;
      const items = await catalogService.listStoreCategories(featured);
      res.status(200).json(okResponse({ items }, 'Categorías obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.get('/products', validateQuery(storeProductsQuery), async (req, res, next) => {
    try {
      const data = await catalogService.listStoreProducts(
        req.query as unknown as z.infer<typeof storeProductsQuery>,
      );
      res.status(200).json(okResponse(data, 'Catálogo obtenido'));
    } catch (err) {
      next(err);
    }
  });

  router.get('/trending-searches', validateQuery(trendingSearchesQuery), async (req, res, next) => {
    try {
      const limit = Number(req.query.limit ?? 6);
      const items = await catalogService.listTrendingSearches(limit);
      res.status(200).json(okResponse({ items }, 'Búsquedas populares obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.get('/products/:slug', async (req, res, next) => {
    try {
      const slug = String(req.params.slug ?? '').trim();
      const product = await catalogService.getStoreProductBySlug(slug);
      res.status(200).json(okResponse(product, 'Detalle de producto obtenido'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createCrmCatalogRouter(catalogService: CatalogService): Router {
  const router = Router();

  router.get('/categories', requireRoles('admin', 'vendedor', 'almacen'), async (_req, res, next) => {
    try {
      const items = await catalogService.listCrmCategories();
      res.status(200).json(okResponse({ items }, 'Categorías del CRM obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/categories',
    requireRoles('admin', 'almacen'),
    validateBody(upsertCategorySchema),
    async (req, res, next) => {
      try {
        const created = await catalogService.createCategory(req.body);
        res.status(201).json(okResponse(created, 'Categoría creada correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.put(
    '/categories/:category_id',
    requireRoles('admin', 'almacen'),
    validateParams(idParam('category_id')),
    validateBody(upsertCategorySchema),
    async (req, res, next) => {
      try {
        const updated = await catalogService.updateCategory(Number(req.params.category_id), req.body);
        res.status(200).json(okResponse(updated, 'Categoría actualizada correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/products',
    requireRoles('admin', 'vendedor', 'almacen'),
    validateQuery(crmProductsQuery),
    async (req, res, next) => {
      try {
        const data = await catalogService.listCrmProducts({
          ...(req.query as unknown as z.infer<typeof crmProductsQuery>),
          store_id: req.authUser!.store_id,
        });
        res.status(200).json(okResponse(data, 'Productos del CRM obtenidos'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/products',
    requireRoles('admin', 'almacen'),
    validateBody(createProductSchema),
    async (req, res, next) => {
      try {
        const created = await catalogService.createProduct(
          { ...req.body, store_id: req.authUser!.store_id ?? 1 },
          req.authUser!.user_id,
        );
        res.status(201).json(okResponse(created, 'Producto creado correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.put(
    '/products/:product_id',
    requireRoles('admin', 'almacen'),
    validateParams(idParam('product_id')),
    validateBody(updateProductSchema),
    async (req, res, next) => {
      try {
        const updated = await catalogService.updateProduct(
          Number(req.params.product_id),
          req.body,
          req.authUser!.store_id,
        );
        res.status(200).json(okResponse(updated, 'Producto actualizado correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/products/:product_id/status',
    requireRoles('admin', 'almacen'),
    validateParams(idParam('product_id')),
    validateBody(z.object({ is_active: z.boolean() })),
    async (req, res, next) => {
      try {
        const updated = await catalogService.updateProductStatus(
          Number(req.params.product_id),
          Boolean((req.body as { is_active: boolean }).is_active),
          req.authUser!.store_id,
        );
        res.status(200).json(okResponse(updated, 'Estado del producto actualizado'));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
