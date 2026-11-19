import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  CORS_TIENDA_ORIGIN: z.string().url().default('http://localhost:5173'),
  CORS_CRM_ORIGIN: z.string().url().default('http://localhost:5174'),

  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_POOL_LIMIT: z.coerce.number().int().min(1).max(50).default(10),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  IDEMPOTENCY_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(10).default(120),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`[Fail-Fast Config] Variables de entorno inválidas: ${issues}`);
  }
  return parsed.data;
}

export const env: EnvConfig = loadEnv();
