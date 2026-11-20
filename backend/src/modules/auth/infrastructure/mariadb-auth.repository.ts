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

function mapSvaRole(svaRol: string): UserRole {
  switch (svaRol) {
    case 'admin':
    case 'gerente':
      return 'admin';
    case 'vendedor':
    case 'asesor':
      return 'vendedor';
    case 'almacen':
      return 'almacen';
    case 'cliente':
    default:
      return 'cliente';
  }
}

export class MariaDbAuthRepository implements AuthRepositoryPort {
  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const rows = (await dbPool.query(
      `SELECT id AS user_id, nombre AS full_name, email, password AS password_hash,
              rol AS role, IF(estado = 'activo', 1, 0) AS is_active
         FROM usuarios
        WHERE email = ?
        LIMIT 1`,
      [email.toLowerCase()],
    )) as UserRow[];

    const row = rows[0];
    return row ? this.mapUser(row) : null;
  }

  async findUserById(userId: number): Promise<UserEntity | null> {
    const rows = (await dbPool.query(
      `SELECT id AS user_id, nombre AS full_name, email, password AS password_hash,
              rol AS role, IF(estado = 'activo', 1, 0) AS is_active
         FROM usuarios
        WHERE id = ?
        LIMIT 1`,
      [userId],
    )) as UserRow[];

    const row = rows[0];
    return row ? this.mapUser(row) : null;
  }

  async registerCustomer(input: RegisterCustomerInput): Promise<UserEntity> {
    const emailLower = input.email.toLowerCase();
    const docId = input.document_id || 'V-00000000';

    const userId = await withTransaction(async (conn) => {
      let clienteId: number;
      const existingCli = (await conn.query(
        `SELECT id FROM clientes WHERE email = ? OR cedula_rif = ? LIMIT 1`,
        [emailLower, docId],
      )) as { id: number }[];

      if (existingCli[0]) {
        clienteId = Number(existingCli[0].id);
      } else {
        const cliRes = (await conn.query(
          `INSERT INTO clientes (cedula_rif, nombre, direccion, telefono, email)
           VALUES (?, ?, ?, ?, ?)`,
          [
            docId,
            input.full_name,
            input.shipping_address,
            input.phone,
            emailLower,
          ],
        )) as { insertId: number };
        clienteId = Number(cliRes.insertId);
      }

      const userRes = (await conn.query(
        `INSERT INTO usuarios (nombre, email, password, rol, cedula, cliente_id, estado)
         VALUES (?, ?, ?, 'cliente', ?, ?, 'activo')`,
        [
          input.full_name,
          emailLower,
          input.password_hash,
          docId,
          clienteId,
        ],
      )) as { insertId: number };

      return Number(userRes.insertId);
    });

    const created = await this.findUserById(userId);
    if (!created) throw new Error('Invariant broken: usuario cliente recién creado no encontrado');
    return created;
  }

  async updateLastLogin(_userId: number): Promise<void> {
    // SVA no tiene columna last_login_at en usuarios, operación no bloqueante
  }

  async saveRefreshToken(params: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void> {
    await dbPool.query(
      `INSERT INTO refresh_tokens
        (user_id, token_hash, user_agent, ip_address, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        params.userId,
        params.tokenHash,
        params.userAgent,
        params.ipAddress,
        params.expiresAt,
      ],
    );
  }

  async findValidRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = (await dbPool.query(
      `SELECT refresh_token_id, user_id, token_hash, expires_at, revoked_at
         FROM refresh_tokens
        WHERE token_hash = ?
          AND revoked_at IS NULL
          AND expires_at > NOW(3)
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
      `UPDATE refresh_tokens SET revoked_at = NOW(3) WHERE token_hash = ?`,
      [tokenHash],
    );
  }

  async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await dbPool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(3) WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  }

  private mapUser(row: UserRow): UserEntity {
    return {
      user_id: Number(row.user_id),
      full_name: row.full_name,
      email: row.email,
      password_hash: row.password_hash,
      role: mapSvaRole(String(row.role)),
      is_active: Boolean(row.is_active),
    };
  }
}
