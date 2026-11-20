import { Router } from 'express';
import { z } from 'zod';
import { okResponse } from '../../../shared/contracts/api-response.js';
import { env } from '../../../shared/infrastructure/config/env.js';
import {
  authenticateJwt,
  requireRoles,
  validateBody,
  validateParams,
  validateQuery,
} from '../../../shared/infrastructure/http/middlewares.js';
import type { MarketplaceService } from '../application/marketplace.service.js';

const slugParamSchema = z.object({
  slug: z.string().trim().min(2).max(160),
});

const productIdParamSchema = z.object({
  product_id: z.coerce.number().int().positive(),
});

const questionIdParamSchema = z.object({
  question_id: z.coerce.number().int().positive(),
});

const reviewIdParamSchema = z.object({
  review_id: z.coerce.number().int().positive(),
});

const orderNumberParamSchema = z.object({
  order_number: z.string().trim().min(3).max(40),
});

const orderIdParamSchema = z.object({
  order_id: z.coerce.number().int().positive(),
});

const registerStoreSchema = z.object({
  owner_name: z.string().trim().min(2).max(150),
  owner_email: z.string().trim().email().max(190),
  password: z.string().min(6).max(128),
  store_name: z.string().trim().min(2).max(140),
  store_slug: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  city: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(40),
  logo_url: z.string().trim().max(500).nullable().optional(),
});

const updateStoreSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(190).nullable().optional(),
  logo_url: z.string().trim().max(500).nullable().optional(),
  banner_url: z.string().trim().max(500).nullable().optional(),
});

const askQuestionSchema = z.object({
  question_text: z.string().trim().min(5).max(600),
});

const answerQuestionSchema = z.object({
  answer_text: z.string().trim().min(2).max(1000),
});

const createReviewSchema = z.object({
  order_number: z.string().trim().min(3).max(40),
  product_rating: z.coerce.number().int().min(1).max(5),
  seller_rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(140).nullable().optional(),
  comment: z.string().trim().min(5).max(1000),
});

const replyReviewSchema = z.object({
  seller_reply: z.string().trim().min(2).max(800),
});

const contactQuerySchema = z.object({
  contact: z.string().trim().min(4).max(190),
});

const buyerMessageSchema = z.object({
  contact: z.string().trim().min(4).max(190),
  message_text: z.string().trim().min(1).max(1000),
});

const sellerMessageSchema = z.object({
  message_text: z.string().trim().min(1).max(1000),
});

const uploadImageSchema = z.object({
  data_url: z.string().min(20).max(4_500_000),
});

export function createStoreMarketplaceRouter(service: MarketplaceService): Router {
  const router = Router();

  router.get('/stores', async (_req, res, next) => {
    try {
      const stores = await service.listPublicStores();
      res.status(200).json(okResponse(stores, 'Tiendas del marketplace obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.get('/stores/:slug', validateParams(slugParamSchema), async (req, res, next) => {
    try {
      const store = await service.getPublicStoreBySlug(String(req.params.slug));
      res.status(200).json(okResponse(store, 'Perfil de tienda obtenido'));
    } catch (err) {
      next(err);
    }
  });

  router.post('/stores/register', validateBody(registerStoreSchema), async (req, res, next) => {
    try {
      const result = await service.registerStore({
        ...req.body,
        description: req.body.description ?? null,
        logo_url: req.body.logo_url ?? null,
        userAgent: req.header('user-agent') ?? null,
        ipAddress: req.ip ?? null,
      });

      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: env.NODE_ENV === 'production',
        path: '/api/v1/auth',
        maxAge: env.JWT_REFRESH_TTL_DAYS * 86400 * 1000,
      });

      res.status(201).json(
        okResponse(
          {
            access_token: result.access_token,
            expires_in_seconds: result.expires_in_seconds,
            user: result.user,
            store: result.store,
          },
          'Tienda creada y sesión iniciada correctamente',
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  // Q&A público por producto
  router.get('/products/:product_id/questions', validateParams(productIdParamSchema), async (req, res, next) => {
    try {
      const questions = await service.listProductQuestions(Number(req.params.product_id));
      res.status(200).json(okResponse(questions, 'Preguntas del producto obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/products/:product_id/questions',
    authenticateJwt,
    validateParams(productIdParamSchema),
    validateBody(askQuestionSchema),
    async (req, res, next) => {
      try {
        const created = await service.askProductQuestion({
          product_id: Number(req.params.product_id),
          user_id: req.authUser!.user_id,
          customer_name: req.authUser!.full_name,
          customer_email: req.authUser!.email,
          question_text: req.body.question_text,
        });
        res.status(201).json(okResponse(created, 'Pregunta publicada'));
      } catch (err) {
        next(err);
      }
    },
  );

  // Reseñas verificadas por producto (lectura pública, escritura autenticada)
  router.get('/products/:product_id/reviews', validateParams(productIdParamSchema), async (req, res, next) => {
    try {
      const reviews = await service.listProductReviews(Number(req.params.product_id));
      res.status(200).json(okResponse(reviews, 'Reseñas del producto obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/products/:product_id/reviews',
    authenticateJwt,
    validateParams(productIdParamSchema),
    validateBody(createReviewSchema),
    async (req, res, next) => {
      try {
        const created = await service.createVerifiedReview({
          product_id: Number(req.params.product_id),
          order_number: req.body.order_number,
          contact: req.authUser!.email,
          product_rating: req.body.product_rating,
          seller_rating: req.body.seller_rating,
          title: req.body.title ?? null,
          comment: req.body.comment,
        });
        res.status(201).json(okResponse(created, 'Reseña verificada publicada'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/my/orders', authenticateJwt, async (req, res, next) => {
    try {
      const orders = await service.listCustomerOrders(req.authUser!.email);
      res.status(200).json(okResponse(orders, 'Pedidos del cliente obtenidos'));
    } catch (err) {
      next(err);
    }
  });

  // Chat privado de pedido (Comprador -> Tienda)
  router.get(
    '/orders/:order_number/messages',
    validateParams(orderNumberParamSchema),
    validateQuery(contactQuerySchema),
    async (req, res, next) => {
      try {
        const data = await service.listBuyerOrderMessages(
          String(req.params.order_number),
          String(req.query.contact),
        );
        res.status(200).json(okResponse(data, 'Mensajes del pedido obtenidos'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/orders/:order_number/messages',
    validateParams(orderNumberParamSchema),
    validateBody(buyerMessageSchema),
    async (req, res, next) => {
      try {
        const created = await service.sendBuyerOrderMessage({
          order_number: String(req.params.order_number),
          contact: req.body.contact,
          message_text: req.body.message_text,
        });
        res.status(201).json(okResponse(created, 'Mensaje enviado a la tienda'));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export function createCrmMarketplaceRouter(service: MarketplaceService): Router {
  const router = Router();

  router.post(
    '/uploads/images',
    requireRoles('admin', 'vendedor', 'almacen'),
    validateBody(uploadImageSchema),
    async (req, res, next) => {
      try {
        const result = await service.saveUploadedImageDataUrl(req.body.data_url);
        res.status(201).json(okResponse(result, 'Imagen subida correctamente'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/stores/me', requireRoles('admin', 'vendedor', 'almacen'), async (req, res, next) => {
    try {
      const data = await service.getMyStore(req.authUser!.store_id);
      res.status(200).json(okResponse(data, 'Información de tienda obtenida'));
    } catch (err) {
      next(err);
    }
  });

  router.put(
    '/stores/me',
    requireRoles('admin'),
    validateBody(updateStoreSchema),
    async (req, res, next) => {
      try {
        const updated = await service.updateMyStore(req.authUser!.store_id, {
          name: req.body.name,
          description: req.body.description ?? null,
          city: req.body.city ?? null,
          phone: req.body.phone ?? null,
          email: req.body.email ?? null,
          logo_url: req.body.logo_url ?? null,
          banner_url: req.body.banner_url ?? null,
        });
        res.status(200).json(okResponse(updated, 'Perfil de tienda actualizado'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/questions', requireRoles('admin', 'vendedor'), async (req, res, next) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const questions = await service.listStoreQuestions(req.authUser!.store_id, status);
      res.status(200).json(okResponse(questions, 'Preguntas de clientes obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/questions/:question_id/answer',
    requireRoles('admin', 'vendedor'),
    validateParams(questionIdParamSchema),
    validateBody(answerQuestionSchema),
    async (req, res, next) => {
      try {
        const updated = await service.answerQuestion(
          Number(req.params.question_id),
          req.authUser!.store_id,
          req.authUser!.user_id,
          req.body.answer_text,
        );
        res.status(200).json(okResponse(updated, 'Respuesta publicada'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/sales/:order_id/messages',
    requireRoles('admin', 'vendedor', 'almacen'),
    validateParams(orderIdParamSchema),
    async (req, res, next) => {
      try {
        const messages = await service.listSellerOrderMessages(
          Number(req.params.order_id),
          req.authUser!.store_id,
        );
        res.status(200).json(okResponse(messages, 'Mensajes del pedido obtenidos'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/sales/:order_id/messages',
    requireRoles('admin', 'vendedor'),
    validateParams(orderIdParamSchema),
    validateBody(sellerMessageSchema),
    async (req, res, next) => {
      try {
        const created = await service.sendSellerOrderMessage({
          order_id: Number(req.params.order_id),
          store_id: req.authUser!.store_id,
          user_id: req.authUser!.user_id,
          sender_name: req.authUser!.full_name,
          message_text: req.body.message_text,
        });
        res.status(201).json(okResponse(created, 'Mensaje enviado al comprador'));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/reviews', requireRoles('admin', 'vendedor'), async (req, res, next) => {
    try {
      const reviews = await service.listStoreReviews(req.authUser!.store_id);
      res.status(200).json(okResponse(reviews, 'Reseñas de la tienda obtenidas'));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/reviews/:review_id/reply',
    requireRoles('admin', 'vendedor'),
    validateParams(reviewIdParamSchema),
    validateBody(replyReviewSchema),
    async (req, res, next) => {
      try {
        const updated = await service.replyToReview(
          Number(req.params.review_id),
          req.authUser!.store_id,
          req.body.seller_reply,
        );
        res.status(200).json(okResponse(updated, 'Respuesta a reseña publicada'));
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
