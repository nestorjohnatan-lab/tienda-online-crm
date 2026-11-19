import { createApp } from './app.js';
import { env } from './shared/infrastructure/config/env.js';
import { checkDatabaseHealth, closeDatabasePool } from './shared/infrastructure/database/pool.js';
import { logger } from './shared/infrastructure/logging/logger.js';

async function bootstrap(): Promise<void> {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
      },
      'Backend API escuchando conexiones HTTP',
    );

    void checkDatabaseHealth().then((dbReady) => {
      if (dbReady) {
        logger.info({ db_name: env.DB_NAME }, 'Conexión verificada con MariaDB');
      } else {
        logger.warn(
          { db_host: env.DB_HOST, db_port: env.DB_PORT, db_name: env.DB_NAME },
          'MariaDB aún no está aprovisionada o accesible; /health/ready reportará 503 hasta conectar',
        );
      }
    });
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Iniciando apagado ordenado del servidor');
    server.close(async () => {
      await closeDatabasePool();
      logger.info('Pool de MariaDB cerrado correctamente');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
