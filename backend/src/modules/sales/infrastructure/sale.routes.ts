import { Router } from 'express';
import { z } from 'zod';
import { okResponse } from '../../../shared/contracts/api-response.js';
import { runIdempotentTransaction } from '../../../shared/infrastructure/http/idempotency.js';
import {
  requireRoles,
  validateBody,
  validateParams,
  validateQuery,
} from '../../../shared/infrastructure/http/middlewares.js';
import type { SaleService } from '../application/sale.service.js';

const paymentMethodEnum = z.enum([
  'efectivo',
  'transferencia',
  'tarjeta',
  'pago_movil',
  'zelle',
  'binance',
  'otro',
]);
const orderStatusEnum = z.enum([
  'pendiente',
  'confirmado',
  'pagado',
  'despachado',
  'entregado',
  'cancelado',
]);

const orderItemSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(1000),
});

const createStoreOrderSchema = z.object({
  customer: z.object({
    full_name: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(190),
    phone: z.string().trim().min(6).max(40),
    document_id: z.string().trim().max(40).nullable().optional().default(null),
    shipping_address: z.string().trim().min(5).max(300),
    city: z.string().trim().min(2).max(100),
  }),
  payment_method: paymentMethodEnum,
  notes: z.string().trim().max(1000).nullable().optional().default(null),
  payment_receipt_data: z
    .string()
    .max(3_000_000, 'La captura de pago excede el tamaño permitido')
    .refine((v) => v.startsWith('data:image/'), 'El comprobante debe ser una imagen válida')
    .nullable()
    .optional()
    .default(null),
  items: z.array(orderItemSchema).min(1).max(50),
});

const createCrmSaleSchema = z
  .object({
    customer_id: z.coerce.number().int().positive().optional(),
    customer: z
      .object({
        full_name: z.string().trim().min(2).max(150),
        email: z.string().trim().email().max(190).nullable().optional().default(null),
        phone: z.string().trim().min(6).max(40),
        document_id: z.string().trim().max(40).nullable().optional().default(null),
        shipping_address: z.string().trim().max(300).nullable().optional().default(null),
        city: z.string().trim().max(100).nullable().optional().default(null),
      })
      .optional(),
    sales_channel: z.enum(['crm_mostrador', 'crm_whatsapp']).default('crm_mostrador'),
    payment_method: paymentMethodEnum,
    discount_amount: z.coerce.number().min(0).default(0),
    shipping_address: z.string().trim().max(300).nullable().optional().default(null),
    notes: z.string().trim().max(1000).nullable().optional().default(null),
    items: z.array(orderItemSchema).min(1).max(50),
  })
  .refine((d) => Boolean(d.customer_id || d.customer), {
    message: 'Debe especificar customer_id o los datos de customer',
  });

const listSalesQuery = z.object({
  order_status: orderStatusEnum.optional(),
  sales_channel: z.enum(['tienda_web', 'crm_mostrador', 'crm_whatsapp']).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

const orderIdParams = z.object({
  order_id: z.coerce.number().int().positive(),
});

const updateStatusSchema = z.object({
  order_status: orderStatusEnum,
});

export function createStoreOrderRouter(saleService: SaleService): Router {
  const router = Router();

  router.post('/', validateBody(createStoreOrderSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createStoreOrderSchema>;
      const result = await runIdempotentTransaction(
        req,
        'POST /api/v1/store/orders',
        async (conn) => {
          const order = await saleService.createOrderInTx(conn, {
            customer: body.customer,
            sales_channel: 'tienda_web',
            payment_method: body.payment_method,
            discount_amount: 0,
            shipping_address: `${body.customer.shipping_address} (${body.customer.city})`,
            notes: body.notes,
            payment_receipt_data: body.payment_receipt_data,
            assigned_user_id: null,
            items: body.items,
          });
          return {
            statusCode: 201,
            body: okResponse(order, 'Pedido registrado correctamente'),
          };
        },
      );
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createCrmSalesRouter(saleService: SaleService): Router {
  const router = Router();

  router.get(
    '/',
    requireRoles('admin', 'vendedor', 'almacen'),
    validateQuery(listSalesQuery),
    async (req, res, next) => {
      try {
        const data = await saleService.listSales(
          req.query as unknown as z.infer<typeof listSalesQuery>,
        );
        res.status(200).json(okResponse(data, 'Ventas obtenidas'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/:order_id',
    requireRoles('admin', 'vendedor', 'almacen'),
    validateParams(orderIdParams),
    async (req, res, next) => {
      try {
        const sale = await saleService.getSaleById(Number(req.params.order_id));
        res.status(200).json(okResponse(sale, 'Detalle de venta obtenido'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/',
    requireRoles('admin', 'vendedor'),
    validateBody(createCrmSaleSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof createCrmSaleSchema>;
        const result = await runIdempotentTransaction(
          req,
          'POST /api/v1/crm/sales',
          async (conn) => {
            const order = await saleService.createOrderInTx(conn, {
              customer_id: body.customer_id,
              customer: body.customer,
              sales_channel: body.sales_channel,
              payment_method: body.payment_method,
              discount_amount: body.discount_amount,
              shipping_address: body.shipping_address,
              notes: body.notes,
              assigned_user_id: req.authUser!.user_id,
              items: body.items,
            });
            return {
              statusCode: 201,
              body: okResponse(order, 'Venta registrada correctamente en CRM'),
            };
          },
        );
        res.status(result.statusCode).json(result.body);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/:order_id/status',
    requireRoles('admin', 'vendedor', 'almacen'),
    validateParams(orderIdParams),
    validateBody(updateStatusSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof updateStatusSchema>;
        const updated = await saleService.updateOrderStatus(
          Number(req.params.order_id),
          body.order_status,
          req.authUser!.user_id,
        );
        res.status(200).json(okResponse(updated, 'Estado de venta actualizado'));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export function createCrmDashboardRouter(saleService: SaleService): Router {
  const router = Router();

  router.get('/summary', requireRoles('admin', 'vendedor', 'almacen'), async (_req, res, next) => {
    try {
      const summary = await saleService.getDashboardSummary();
      res.status(200).json(okResponse(summary, 'Resumen del dashboard obtenido'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
