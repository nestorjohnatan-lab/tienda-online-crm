import { Router } from 'express';
import { z } from 'zod';
import { okResponse } from '../../../shared/contracts/api-response.js';
import {
  requireRoles,
  validateBody,
  validateParams,
} from '../../../shared/infrastructure/http/middlewares.js';
import type { BannerService } from '../application/banner.service.js';

const bannerIdParams = z.object({
  banner_id: z.coerce.number().int().positive(),
});

const upsertBannerSchema = z.object({
  badge_text: z.string().trim().max(80).nullable().optional().default(null),
  title: z.string().trim().min(2).max(140),
  highlight_text: z.string().trim().max(80).nullable().optional().default(null),
  subtitle: z.string().trim().max(280).nullable().optional().default(null),
  image_url: z.string().trim().min(1).max(500),
  image_alt: z.string().trim().min(2).max(200),
  cta_label: z.string().trim().min(1).max(60).default('Explorar Catálogo'),
  cta_url: z.string().trim().min(1).max(300).default('/catalogo'),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  starts_at: z.string().datetime().nullable().optional().default(null),
  ends_at: z.string().datetime().nullable().optional().default(null),
});

const statusSchema = z.object({
  is_active: z.boolean(),
});

const reorderSchema = z.object({
  ordered_banner_ids: z.array(z.coerce.number().int().positive()).min(1).max(50),
});

export function createStoreBannerRouter(bannerService: BannerService): Router {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const items = await bannerService.listForStore();
      res.status(200).json(okResponse({ items }, 'Banners activos obtenidos'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createCrmBannerRouter(bannerService: BannerService): Router {
  const router = Router();

  router.get('/', requireRoles('admin', 'vendedor'), async (_req, res, next) => {
    try {
      const items = await bannerService.listForCrm();
      res.status(200).json(okResponse({ items }, 'Banners del CRM obtenidos'));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requireRoles('admin'), validateBody(upsertBannerSchema), async (req, res, next) => {
    try {
      const created = await bannerService.create(req.body, req.authUser!.user_id);
      res.status(201).json(okResponse(created, 'Banner creado correctamente'));
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/reorder',
    requireRoles('admin'),
    validateBody(reorderSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof reorderSchema>;
        const items = await bannerService.reorder(body.ordered_banner_ids, req.authUser!.user_id);
        res.status(200).json(okResponse({ items }, 'Orden del carrusel actualizado'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.put(
    '/:banner_id',
    requireRoles('admin'),
    validateParams(bannerIdParams),
    validateBody(upsertBannerSchema),
    async (req, res, next) => {
      try {
        const bannerId = Number(req.params.banner_id);
        const updated = await bannerService.update(bannerId, req.body, req.authUser!.user_id);
        res.status(200).json(okResponse(updated, 'Banner actualizado correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/:banner_id/status',
    requireRoles('admin'),
    validateParams(bannerIdParams),
    validateBody(statusSchema),
    async (req, res, next) => {
      try {
        const bannerId = Number(req.params.banner_id);
        const body = req.body as z.infer<typeof statusSchema>;
        const updated = await bannerService.updateStatus(
          bannerId,
          body.is_active,
          req.authUser!.user_id,
        );
        res.status(200).json(okResponse(updated, 'Estado del banner actualizado'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/:banner_id/archive',
    requireRoles('admin'),
    validateParams(bannerIdParams),
    async (req, res, next) => {
      try {
        const bannerId = Number(req.params.banner_id);
        await bannerService.archive(bannerId, req.authUser!.user_id);
        res.status(200).json(okResponse({ archived: true, banner_id: bannerId }, 'Banner archivado'));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
