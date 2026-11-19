import crypto from 'node:crypto';

export function hashRequestPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');
}
