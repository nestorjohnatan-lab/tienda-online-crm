import type { UserRole } from '../../../shared/infrastructure/http/middlewares.js';

export interface UserEntity {
  readonly user_id: number;
  readonly full_name: string;
  readonly email: string;
  readonly password_hash: string;
  readonly role: UserRole;
  readonly is_active: boolean;
}

export interface RefreshTokenRecord {
  readonly refresh_token_id: number;
  readonly user_id: number;
  readonly token_hash: string;
  readonly expires_at: Date;
  readonly revoked_at: Date | null;
}

export interface RegisterCustomerInput {
  readonly full_name: string;
  readonly email: string;
  readonly password_hash: string;
  readonly phone: string;
  readonly document_id: string | null;
  readonly shipping_address: string;
  readonly city: string;
}

export interface AuthRepositoryPort {
  findUserByEmail(email: string): Promise<UserEntity | null>;
  findUserById(userId: number): Promise<UserEntity | null>;
  registerCustomer(input: RegisterCustomerInput): Promise<UserEntity>;
  updateLastLogin(userId: number): Promise<void>;
  saveRefreshToken(params: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void>;
  findValidRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
}
