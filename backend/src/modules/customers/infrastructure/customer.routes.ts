import { Router } from 'express';
import { z } from 'zod';
import { okResponse } from '../../../shared/contracts/api-response.js';
import {
  requireRoles,
  validateBody,
  validateParams,
  validateQuery,
} from '../../../shared/infrastructure/http/middlewares.js';
import type { CustomerService } from '../application/customer.service.js';

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

const upsertCustomerSchema = z.object({
  full_name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(190).nullable().optional().default(null),
  phone: z.string().trim().min(6).max(40),
  document_id: z.string().trim().max(40).nullable().optional().default(null),
  shipping_address: z.string().trim().max(300).nullable().optional().default(null),
  city: z.string().trim().max(100).nullable().optional().default(null),
  vehicle_notes: z.string().trim().max(300).nullable().optional().default(null),
  crm_notes: z.string().trim().max(2000).nullable().optional().default(null),
});

const customerIdParams = z.object({
  customer_id: z.coerce.number().int().positive(),
});

export function createCrmCustomerRouter(customerService: CustomerService): Router {
  const router = Router();

  router.get(
    '/',
    requireRoles('admin', 'vendedor'),
    validateQuery(listQuery),
    async (req, res, next) => {
      try {
        const data = await customerService.list(
          req.query as unknown as z.infer<typeof listQuery>,
        );
        res.status(200).json(okResponse(data, 'Clientes obtenidos'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/:customer_id',
    requireRoles('admin', 'vendedor'),
    validateParams(customerIdParams),
    async (req, res, next) => {
      try {
        const customer = await customerService.getById(Number(req.params.customer_id));
        res.status(200).json(okResponse(customer, 'Cliente obtenido'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/',
    requireRoles('admin', 'vendedor'),
    validateBody(upsertCustomerSchema),
    async (req, res, next) => {
      try {
        const created = await customerService.create(req.body);
        res.status(201).json(okResponse(created, 'Cliente registrado correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.put(
    '/:customer_id',
    requireRoles('admin', 'vendedor'),
    validateParams(customerIdParams),
    validateBody(upsertCustomerSchema),
    async (req, res, next) => {
      try {
        const updated = await customerService.update(Number(req.params.customer_id), req.body);
        res.status(200).json(okResponse(updated, 'Cliente actualizado correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
