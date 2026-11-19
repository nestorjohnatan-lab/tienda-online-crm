import { Router } from 'express';
import { z } from 'zod';
import { okResponse } from '../../../shared/contracts/api-response.js';
import { runIdempotentTransaction } from '../../../shared/infrastructure/http/idempotency.js';
import {
  requireRoles,
  validateBody,
  validateQuery,
} from '../../../shared/infrastructure/http/middlewares.js';
import type { InventoryService } from '../application/inventory.service.js';

const movementQuerySchema = z.object({
  product_id: z.coerce.number().int().positive().optional(),
  movement_type: z
    .enum([
      'entrada',
      'salida_venta',
      'salida_manual',
      'ajuste_positivo',
      'ajuste_negativo',
      'devolucion',
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

const createMovementSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  movement_type: z.enum([
    'entrada',
    'salida_manual',
    'ajuste_positivo',
    'ajuste_negativo',
    'devolucion',
  ]),
  quantity: z.coerce.number().int().positive(),
  unit_cost: z.coerce.number().min(0).nullable().optional().default(null),
  reference_code: z.string().trim().max(80).nullable().optional().default(null),
  notes: z.string().trim().max(300).nullable().optional().default(null),
});

export function createCrmInventoryRouter(inventoryService: InventoryService): Router {
  const router = Router();

  router.get('/alerts', requireRoles('admin', 'almacen', 'vendedor'), async (_req, res, next) => {
    try {
      const items = await inventoryService.listLowStockAlerts();
      res.status(200).json(okResponse({ items }, 'Alertas de stock bajo obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/movements',
    requireRoles('admin', 'almacen'),
    validateQuery(movementQuerySchema),
    async (req, res, next) => {
      try {
        const data = await inventoryService.listMovements(
          req.query as unknown as z.infer<typeof movementQuerySchema>,
        );
        res.status(200).json(okResponse(data, 'Kardex de inventario obtenido'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/movements',
    requireRoles('admin', 'almacen'),
    validateBody(createMovementSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof createMovementSchema>;
        const result = await runIdempotentTransaction(
          req,
          'POST /api/v1/crm/inventory/movements',
          async (conn) => {
            const movement = await inventoryService.recordManualMovementInTx(conn, {
              ...body,
              performed_by: req.authUser!.user_id,
            });
            return {
              statusCode: 201,
              body: okResponse(movement, 'Movimiento de inventario registrado'),
            };
          },
        );
        res.status(result.statusCode).json(result.body);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
