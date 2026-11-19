import { Router } from 'express';
import { z } from 'zod';
import { okResponse } from '../../../shared/contracts/api-response.js';
import { requireRoles, validateBody } from '../../../shared/infrastructure/http/middlewares.js';
import type { SettingsService } from '../application/settings.service.js';
import { DEFAULT_PAYMENT_ACCOUNTS } from '../domain/settings.repository.js';

const paymentAccountsSchema = z.object({
  pago_movil: z.object({
    enabled: z.boolean().default(true),
    bank: z.string().trim().max(100).default(''),
    phone: z.string().trim().max(40).default(''),
    document_id: z.string().trim().max(40).default(''),
    holder_name: z.string().trim().max(120).default(''),
  }),
  transferencia: z.object({
    enabled: z.boolean().default(true),
    bank: z.string().trim().max(100).default(''),
    account_number: z.string().trim().max(60).default(''),
    account_type: z.string().trim().max(40).default('Corriente'),
    document_id: z.string().trim().max(40).default(''),
    holder_name: z.string().trim().max(120).default(''),
  }),
  zelle: z.object({
    enabled: z.boolean().default(true),
    email: z.string().trim().max(160).default(''),
    holder_name: z.string().trim().max(120).default(''),
  }),
  binance: z.object({
    enabled: z.boolean().default(true),
    pay_id: z.string().trim().max(80).default(''),
    email: z.string().trim().max(160).default(''),
    holder_name: z.string().trim().max(120).default(''),
  }),
});

const updateSettingsSchema = z.object({
  free_shipping_threshold: z.coerce.number().min(0).max(1000000),
  free_shipping_enabled: z.boolean(),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  bcv_rate: z.coerce.number().positive('La tasa BCV debe ser mayor que cero').max(10000000),
  show_bs_prices: z.boolean(),
  payment_accounts: paymentAccountsSchema.optional().default(DEFAULT_PAYMENT_ACCOUNTS),
});

export function createStoreSettingsRouter(settingsService: SettingsService): Router {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const settings = await settingsService.getForStore();
      res.status(200).json(okResponse(settings, 'Configuración de tienda obtenida'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createCrmSettingsRouter(settingsService: SettingsService): Router {
  const router = Router();

  router.get('/', requireRoles('admin', 'vendedor', 'almacen'), async (_req, res, next) => {
    try {
      const settings = await settingsService.getForCrm();
      res.status(200).json(okResponse(settings, 'Configuración del CRM obtenida'));
    } catch (err) {
      next(err);
    }
  });

  router.put(
    '/',
    requireRoles('admin'),
    validateBody(updateSettingsSchema),
    async (req, res, next) => {
      try {
        const updated = await settingsService.updateForCrm(
          req.body as z.infer<typeof updateSettingsSchema>,
          req.authUser!.user_id,
        );
        res.status(200).json(okResponse(updated, 'Configuración de tienda actualizada'));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
