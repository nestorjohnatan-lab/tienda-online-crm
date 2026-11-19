import { Router } from 'express';
import { errorResponse, okResponse } from '../../../shared/contracts/api-response.js';
import { checkDatabaseHealth } from '../../../shared/infrastructure/database/pool.js';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/live', (_req, res) => {
    res.status(200).json(
      okResponse(
        {
          uptime_seconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        },
        'Service is alive',
      ),
    );
  });

  router.get('/ready', async (_req, res) => {
    const dbUp = await checkDatabaseHealth();
    if (!dbUp) {
      res
        .status(503)
        .json(errorResponse('DATABASE_UNAVAILABLE', 'No hay conexión disponible con MariaDB'));
      return;
    }

    res.status(200).json(
      okResponse(
        {
          database: 'up',
          timestamp: new Date().toISOString(),
        },
        'Service is ready',
      ),
    );
  });

  return router;
}
