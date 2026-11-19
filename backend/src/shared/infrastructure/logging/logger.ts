import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'tienda-crm-backend',
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'password_hash',
      'refresh_token',
      'access_token',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
