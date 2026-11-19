import type { PoolConnection } from 'mariadb';
import type { Request } from 'express';
import { ConflictError, ValidationError } from '../../domain/app-error.js';
import { hashRequestPayload } from '../../domain/idempotency-hash.js';
import { env } from '../config/env.js';
import { withTransaction } from '../database/pool.js';

export interface IdempotentResult<TBody> {
  readonly statusCode: number;
  readonly body: TBody;
  readonly replayed: boolean;
}

export function extractIdempotencyKey(req: Request): string {
  const key = req.header('idempotency-key')?.trim();
  if (!key || key.length < 12 || key.length > 100) {
    throw new ValidationError('La cabecera Idempotency-Key es obligatoria (12 a 100 caracteres)', [
      { field: 'Idempotency-Key', issue: 'Cabecera requerida para garantizar idempotencia' },
    ]);
  }
  return key;
}

interface StoredIdempotencyRow {
  request_hash: string;
  response_status: number;
  response_body: string;
}

export async function runIdempotentTransaction<TBody>(
  req: Request,
  endpoint: string,
  work: (conn: PoolConnection) => Promise<{ statusCode: number; body: TBody }>,
): Promise<IdempotentResult<TBody>> {
  const key = extractIdempotencyKey(req);
  const requestHash = hashRequestPayload(req.body);

  return withTransaction(async (conn) => {
    const existingRows = (await conn.query(
      `SELECT request_hash, response_status, response_body
         FROM idempotency_keys
        WHERE idempotency_key = ? AND endpoint = ? AND expires_at > NOW(3)
        LIMIT 1 FOR UPDATE`,
      [key, endpoint],
    )) as StoredIdempotencyRow[];

    const existing = existingRows[0];
    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ConflictError(
          'La misma Idempotency-Key ya fue utilizada con un payload diferente',
          'IDEMPOTENCY_KEY_CONFLICT',
        );
      }
      return {
        statusCode: Number(existing.response_status),
        body: JSON.parse(existing.response_body) as TBody,
        replayed: true,
      };
    }

    const result = await work(conn);
    const expiresAt = new Date(Date.now() + env.IDEMPOTENCY_TTL_HOURS * 3600 * 1000);

    await conn.query(
      `INSERT INTO idempotency_keys
        (idempotency_key, endpoint, request_hash, response_status, response_body, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [key, endpoint, requestHash, result.statusCode, JSON.stringify(result.body), expiresAt],
    );

    return {
      statusCode: result.statusCode,
      body: result.body,
      replayed: false,
    };
  });
}
