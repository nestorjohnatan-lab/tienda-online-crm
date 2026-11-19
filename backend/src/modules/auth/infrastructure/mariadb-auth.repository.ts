import { dbPool, withTransaction } from '../../../shared/infrastructure/database/pool.js';
import type { UserRole } from '../../../shared/infrastructure/http/middlewares.js';
import type {
  AuthRepositoryPort,
  RefreshTokenRecord,
  RegisterCustomerInput,
  UserEntity,
} from '../domain/auth.repository.js';

interface UserRow {
  user_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
}

interface RefreshTokenRow {
  refresh_token_id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export class MariaDbAuthRepository implements AuthRepositoryPort {
  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const rows = (await dbPool.query(
      `SELECT user_id, full_name, email, password_hash, role, is_active
         FROM users
        WHERE email = ? AND deleted_at IS NULL
        LIMIT 1`,
      [email.toLowerCase()],
    )) as UserRow[];

    const row = rows[0];
    return row ? this.mapUser(row) : null;
  }

  async findUserById(userId: number): Promise<UserEntity | null> {
    const rows = (await dbPool.query(
      `SELECT user_id, full_name, email, password_hash, role, is_active
         FROM users
        WHERE user_id = ? AND deleted_at IS NULL
        LIMIT 1`,
      [userId],
    )) as UserRow[];

    const row = rows[0];
    return row ? this.mapUser(row) : null;
  }

  async registerCustomer(input: RegisterCustomerInput): Promise<UserEntity> {
    const emailLower = input.email.toLowerCase();
    const userId = await withTransaction(async (conn) => {
      const userRes = (await conn.query(
        `INSERT INTO users (full_name, email, password_hash, role, is_active, last_login_at)
         VALUES (?, ?, ?, 'cliente', 1, NOW(3))`,
        [input.full_name, emailLower, input.password_hash],
      )) as { insertId: number };

      const existingCustomer = (await conn.query(
        `SELECT customer_id FROM customers WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
        [emailLower],
      )) as { customer_id: number }[];

      if (!existingCustomer[0]) {
        await conn.query(
          `INSERT INTO customers (full_name, email, phone, document_id, shipping_address, city)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            input.full_name,
            emailLower,
            input.phone,
            input.document_id,
            input.shipping_address,
            input.city,
          ],
        );
      }

      return Number(userRes.insertId);
    });

    const created = await this.findUserById(userId);
    if (!created) throw new Error('Invariant broken: usuario cliente recién creado no encontrado');
    return created;
  }

  async updateLastLogin(userId: number): Promise<void> {
    await dbPool.query(`UPDATE users SET last_login_at = NOW(3) WHERE user_id = ?`, [userId]);
  }

  async saveRefreshToken(params: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void> {
    await dbPool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [params.userId, params.tokenHash, params.userAgent, params.ipAddress, params.expiresAt],
    );
  }

  async findValidRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = (await dbPool.query(
      `SELECT refresh_token_id, user_id, token_hash, expires_at, revoked_at
         FROM refresh_tokens
        WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW(3)
        LIMIT 1`,
      [tokenHash],
    )) as RefreshTokenRow[];

    const row = rows[0];
    if (!row) return null;
    return {
      refresh_token_id: Number(row.refresh_token_id),
      user_id: Number(row.user_id),
      token_hash: row.token_hash,
      expires_at: new Date(row.expires_at),
      revoked_at: row.revoked_at ? new Date(row.revoked_at) : null,
    };
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await dbPool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(3) WHERE token_hash = ? AND revoked_at IS NULL`,
      [tokenHash],
    );
  }

  private mapUser(row: UserRow): UserEntity {
    return {
      user_id: Number(row.user_id),
      full_name: row.full_name,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      is_active: Boolean(row.is_active),
    };
  }
}
