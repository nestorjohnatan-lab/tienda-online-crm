import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AuthService } from './modules/auth/application/auth.service.js';
import { createAuthRouter } from './modules/auth/infrastructure/auth.routes.js';
import { MariaDbAuthRepository } from './modules/auth/infrastructure/mariadb-auth.repository.js';
import { BannerService } from './modules/banners/application/banner.service.js';
import {
  createCrmBannerRouter,
  createStoreBannerRouter,
} from './modules/banners/infrastructure/banner.routes.js';
import { MariaDbBannerRepository } from './modules/banners/infrastructure/mariadb-banner.repository.js';
import { CatalogService } from './modules/catalog/application/catalog.service.js';
import {
  createCrmCatalogRouter,
  createStoreCatalogRouter,
} from './modules/catalog/infrastructure/catalog.routes.js';
import { MariaDbCatalogRepository } from './modules/catalog/infrastructure/mariadb-catalog.repository.js';
import { CustomerService } from './modules/customers/application/customer.service.js';
import { createCrmCustomerRouter } from './modules/customers/infrastructure/customer.routes.js';
import { MariaDbCustomerRepository } from './modules/customers/infrastructure/mariadb-customer.repository.js';
import { createHealthRouter } from './modules/health/infrastructure/health.routes.js';
import { InventoryService } from './modules/inventory/application/inventory.service.js';
import { createCrmInventoryRouter } from './modules/inventory/infrastructure/inventory.routes.js';
import { MariaDbInventoryRepository } from './modules/inventory/infrastructure/mariadb-inventory.repository.js';
import { SaleService } from './modules/sales/application/sale.service.js';
import { MariaDbSaleRepository } from './modules/sales/infrastructure/mariadb-sale.repository.js';
import {
  createCrmDashboardRouter,
  createCrmSalesRouter,
  createStoreOrderRouter,
} from './modules/sales/infrastructure/sale.routes.js';
import { SettingsService } from './modules/settings/application/settings.service.js';
import { MariaDbSettingsRepository } from './modules/settings/infrastructure/mariadb-settings.repository.js';
import {
  createCrmSettingsRouter,
  createStoreSettingsRouter,
} from './modules/settings/infrastructure/settings.routes.js';
import { errorResponse, okResponse } from './shared/contracts/api-response.js';
import { env } from './shared/infrastructure/config/env.js';
import {
  authenticateJwt,
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
} from './shared/infrastructure/http/middlewares.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');

  // Seguridad HTTP por defecto (Defense in Depth / Secure by Default)
  app.use(helmet());
  app.use(
    cors({
      origin: [env.CORS_TIENDA_ORIGIN, env.CORS_CRM_ORIGIN],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    }),
  );
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: errorResponse('RATE_LIMIT_EXCEEDED', 'Demasiadas peticiones, intenta nuevamente'),
    }),
  );

  app.use(express.json({ limit: '4mb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);

  // Dependencias (Ports & Adapters)
  const authService = new AuthService(new MariaDbAuthRepository());
  const bannerService = new BannerService(new MariaDbBannerRepository());
  const catalogService = new CatalogService(new MariaDbCatalogRepository());
  const inventoryService = new InventoryService(new MariaDbInventoryRepository());
  const customerService = new CustomerService(new MariaDbCustomerRepository());
  const saleService = new SaleService(new MariaDbSaleRepository());
  const settingsService = new SettingsService(new MariaDbSettingsRepository());

  // Raíz informativa JSON (sin HTML embebido)
  app.get('/', (_req, res) => {
    res.status(200).json(
      okResponse(
        {
          name: 'Tienda Online + CRM API',
          version: 'v1',
          health: {
            live: '/health/live',
            ready: '/health/ready',
          },
          endpoints: {
            auth: '/api/v1/auth',
            store: '/api/v1/store',
            crm: '/api/v1/crm',
          },
        },
        'API REST operativa',
      ),
    );
  });

  // Observabilidad
  app.use('/health', createHealthRouter());

  // API v1
  const apiV1 = Router();
  apiV1.use('/auth', createAuthRouter(authService));

  // Tienda Online (rutas públicas)
  const storeRouter = Router();
  storeRouter.use('/banners', createStoreBannerRouter(bannerService));
  storeRouter.use('/settings', createStoreSettingsRouter(settingsService));
  storeRouter.use('/', createStoreCatalogRouter(catalogService));
  storeRouter.use('/orders', createStoreOrderRouter(saleService));
  apiV1.use('/store', storeRouter);

  // Panel CRM (Zero Trust: autenticación JWT obligatoria en toda la rama)
  const crmRouter = Router();
  crmRouter.use(authenticateJwt);
  crmRouter.use('/dashboard', createCrmDashboardRouter(saleService));
  crmRouter.use('/banners', createCrmBannerRouter(bannerService));
  crmRouter.use('/', createCrmCatalogRouter(catalogService));
  crmRouter.use('/inventory', createCrmInventoryRouter(inventoryService));
  crmRouter.use('/customers', createCrmCustomerRouter(customerService));
  crmRouter.use('/sales', createCrmSalesRouter(saleService));
  crmRouter.use('/settings', createCrmSettingsRouter(settingsService));
  apiV1.use('/crm', crmRouter);

  app.use('/api/v1', apiV1);

  // Manejo de 404 y errores globales
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
