import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError, type ZodTypeAny } from 'zod';
import { errorResponse } from '../../contracts/api-response.js';
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '../../domain/app-error.js';
import { env } from '../config/env.js';
import { logger } from '../logging/logger.js';

export type UserRole = 'admin' | 'vendedor' | 'almacen' | 'cliente';

export interface AuthUserContext {
  readonly user_id: number;
  readonly email: string;
  readonly role: UserRole;
  readonly full_name: string;
  readonly store_id: number | null;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser?: AuthUserContext;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.header('x-request-id');
  const requestId =
    incomingId && incomingId.length >= 8 && incomingId.length <= 64
      ? incomingId
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info(
      {
        request_id: requestId,
        method: req.method,
        path: req.originalUrl,
        status_code: res.statusCode,
        duration_ms: Number(durationMs.toFixed(2)),
        user_id: req.authUser?.user_id ?? null,
      },
      'HTTP request completed',
    );
  });

  next();
}

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(zodToValidationError(parsed.error));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(zodToValidationError(parsed.error));
      return;
    }
    Object.assign(req.query, parsed.data);
    next();
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      next(zodToValidationError(parsed.error));
      return;
    }
    Object.assign(req.params, parsed.data);
    next();
  };
}

function zodToValidationError(err: ZodError): ValidationError {
  const details = err.issues.map((issue) => ({
    field: issue.path.join('.') || 'payload',
    issue: issue.message,
  }));
  return new ValidationError('Los datos enviados no son válidos', details);
}

interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  full_name: string;
  store_id?: number | null;
}

export function authenticateJwt(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Token de acceso requerido'));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    const userId = Number(decoded.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      next(new UnauthorizedError('Token de acceso inválido'));
      return;
    }
    req.authUser = {
      user_id: userId,
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.full_name,
      store_id: decoded.store_id != null ? Number(decoded.store_id) : null,
    };
    next();
  } catch {
    next(new UnauthorizedError('Token de acceso inválido o expirado'));
  }
}

export function requireRoles(...allowedRoles: readonly UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(new UnauthorizedError('Autenticación requerida'));
      return;
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      next(new ForbiddenError('Rol sin permisos para esta operación'));
      return;
    }
    next();
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json(errorResponse('ROUTE_NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
    return;
  }

  // Error de sintaxis JSON en express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(errorResponse('INVALID_JSON', 'El cuerpo JSON está mal formado'));
    return;
  }

  // Errores conocidos de MariaDB (duplicados / integridad)
  const dbErr = err as { errno?: number; code?: string; message?: string };
  if (dbErr?.errno === 1062 || dbErr?.code === 'ER_DUP_ENTRY') {
    res
      .status(409)
      .json(errorResponse('DUPLICATE_RESOURCE', 'Ya existe un registro con un valor único duplicado'));
    return;
  }
  if (dbErr?.errno === 1452 || dbErr?.code === 'ER_NO_REFERENCED_ROW_2') {
    res
      .status(400)
      .json(errorResponse('INVALID_REFERENCE', 'La referencia relacional indicada no existe'));
    return;
  }

  if (
    dbErr?.errno === 45028 ||
    dbErr?.errno === 45060 ||
    dbErr?.errno === 1045 ||
    dbErr?.code === 'ER_GET_CONNECTION_TIMEOUT' ||
    dbErr?.code === 'ECONNREFUSED'
  ) {
    res
      .status(503)
      .json(
        errorResponse(
          'DATABASE_UNAVAILABLE',
          'Base de datos MariaDB no disponible o credenciales pendientes de aprovisionamiento',
        ),
      );
    return;
  }

  logger.error(
    {
      request_id: req.requestId,
      err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    },
    'Unhandled application error',
  );

  res
    .status(500)
    .json(errorResponse('INTERNAL_SERVER_ERROR', 'Ocurrió un error interno procesando la solicitud'));
}
