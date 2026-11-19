import mariadb, { type Pool, type PoolConnection } from 'mariadb';
import { env } from '../config/env.js';

export const dbPool: Pool = mariadb.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  connectionLimit: env.DB_POOL_LIMIT,
  minimumIdle: 0,
  connectTimeout: 2000,
  acquireTimeout: 3000,
  decimalAsNumber: true,
  bigIntAsNumber: true,
  insertIdAsNumber: true,
  dateStrings: false,
});

export async function checkDatabaseHealth(): Promise<boolean> {
  let conn: PoolConnection | undefined;
  try {
    conn = await dbPool.getConnection();
    await conn.query('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}

export async function withTransaction<T>(
  work: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.release();
  }
}

export async function closeDatabasePool(): Promise<void> {
  await dbPool.end();
}
