import type { ApiErrorDetail } from '../contracts/api-response.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: readonly ApiErrorDetail[] | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: readonly ApiErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: readonly ApiErrorDetail[]) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permisos para realizar esta acción') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, code, message);
  }
}

export class DomainRuleError extends AppError {
  constructor(message: string, code = 'DOMAIN_RULE_VIOLATION') {
    super(422, code, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Servicio temporalmente no disponible') {
    super(503, 'SERVICE_UNAVAILABLE', message);
  }
}
