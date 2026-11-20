import crypto from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { ConflictError, UnauthorizedError } from '../../../shared/domain/app-error.js';
import { env } from '../../../shared/infrastructure/config/env.js';
import type { AuthRepositoryPort, UserEntity } from '../domain/auth.repository.js';

export interface SessionResult {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in_seconds: number;
  readonly user: {
    readonly user_id: number;
    readonly full_name: string;
    readonly email: string;
    readonly role: UserEntity['role'];
    readonly store_id: number | null;
    readonly phone: string | null;
    readonly shipping_address: string | null;
    readonly city: string | null;
    readonly document_id: string | null;
  };
}

export class AuthService {
  constructor(private readonly authRepo: AuthRepositoryPort) {}

  async register(params: {
    full_name: string;
    email: string;
    password: string;
    phone: string;
    document_id: string | null;
    shipping_address: string;
    city: string;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<SessionResult> {
    const existing = await this.authRepo.findUserByEmail(params.email);
    if (existing) {
      throw new ConflictError('Ya existe una cuenta registrada con ese correo electrónico', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await argon2.hash(params.password, { type: argon2.argon2id });
    const user = await this.authRepo.registerCustomer({
      full_name: params.full_name,
      email: params.email,
      password_hash: passwordHash,
      phone: params.phone,
      document_id: params.document_id,
      shipping_address: params.shipping_address,
      city: params.city,
    });

    return this.issueSession(user, params.userAgent, params.ipAddress);
  }

  async login(params: {
    email: string;
    password: string;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<SessionResult> {
    const user = await this.authRepo.findUserByEmail(params.email);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const passwordValid = await argon2.verify(user.password_hash, params.password);
    if (!passwordValid) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    await this.authRepo.updateLastLogin(user.user_id);
    return this.issueSession(user, params.userAgent, params.ipAddress);
  }

  async refresh(params: {
    refreshToken: string;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<SessionResult> {
    const tokenHash = this.hashToken(params.refreshToken);
    const stored = await this.authRepo.findValidRefreshToken(tokenHash);
    if (!stored) {
      throw new UnauthorizedError('Sesión expirada o inválida');
    }

    await this.authRepo.revokeRefreshToken(tokenHash);

    const user = await this.authRepo.findUserById(stored.user_id);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('Usuario inactivo o no encontrado');
    }

    return this.issueSession(user, params.userAgent, params.ipAddress);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.authRepo.revokeRefreshToken(this.hashToken(refreshToken));
  }

  private async issueSession(
    user: UserEntity,
    userAgent: string | null,
    ipAddress: string | null,
  ): Promise<SessionResult> {
    const accessToken = jwt.sign(
      {
        sub: String(user.user_id),
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        store_id: user.store_id,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL_SECONDS },
    );

    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86400 * 1000);

    await this.authRepo.saveRefreshToken({
      userId: user.user_id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt,
      userAgent,
      ipAddress,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in_seconds: env.JWT_ACCESS_TTL_SECONDS,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        store_id: user.store_id,
        phone: user.phone ?? null,
        shipping_address: user.shipping_address ?? null,
        city: user.city ?? null,
        document_id: user.document_id ?? null,
      },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
