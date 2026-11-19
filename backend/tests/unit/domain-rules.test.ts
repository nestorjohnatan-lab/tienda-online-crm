import { describe, expect, it } from 'vitest';
import { computeMovementDelta } from '../../src/modules/inventory/application/inventory.service.js';
import { assertValidOrderStatusTransition } from '../../src/modules/sales/domain/sale.repository.js';
import { errorResponse, okResponse } from '../../src/shared/contracts/api-response.js';
import { DomainRuleError } from '../../src/shared/domain/app-error.js';
import { hashRequestPayload } from '../../src/shared/domain/idempotency-hash.js';

describe('Contrato de Datos Inmutable (API Response)', () => {
  it('construye sobre success estándar', () => {
    const res = okResponse({ id: 1 }, 'OK');
    expect(res).toEqual({
      status: 'success',
      data: { id: 1 },
      message: 'OK',
    });
  });

  it('construye sobre error estándar con detalles opcionales', () => {
    const res = errorResponse('VALIDATION_ERROR', 'Inválido', [
      { field: 'sku', issue: 'Requerido' },
    ]);
    expect(res.status).toBe('error');
    expect(res.data.code).toBe('VALIDATION_ERROR');
    expect(res.data.details).toHaveLength(1);
  });
});

describe('Reglas de Dominio: Inventario', () => {
  it('calcula delta positivo para entrada, ajuste_positivo y devolucion', () => {
    expect(computeMovementDelta('entrada', 10)).toBe(10);
    expect(computeMovementDelta('ajuste_positivo', 3)).toBe(3);
    expect(computeMovementDelta('devolucion', 2)).toBe(2);
  });

  it('calcula delta negativo para salida_manual y ajuste_negativo', () => {
    expect(computeMovementDelta('salida_manual', 4)).toBe(-4);
    expect(computeMovementDelta('ajuste_negativo', 1)).toBe(-1);
  });

  it('rechaza cantidades cero o negativas', () => {
    expect(() => computeMovementDelta('entrada', 0)).toThrow(DomainRuleError);
    expect(() => computeMovementDelta('entrada', -5)).toThrow(DomainRuleError);
  });
});

describe('Reglas de Dominio: Transiciones de Estado de Ventas', () => {
  it('permite transiciones válidas', () => {
    expect(() => assertValidOrderStatusTransition('pendiente', 'confirmado')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('pendiente', 'pagado')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('pagado', 'despachado')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('despachado', 'entregado')).not.toThrow();
    expect(() => assertValidOrderStatusTransition('pendiente', 'cancelado')).not.toThrow();
  });

  it('bloquea transiciones inválidas o desde estados terminales', () => {
    expect(() => assertValidOrderStatusTransition('entregado', 'cancelado')).toThrow(DomainRuleError);
    expect(() => assertValidOrderStatusTransition('cancelado', 'pagado')).toThrow(DomainRuleError);
    expect(() => assertValidOrderStatusTransition('pendiente', 'entregado')).toThrow(DomainRuleError);
    expect(() => assertValidOrderStatusTransition('pagado', 'pagado')).toThrow(DomainRuleError);
  });
});

describe('Idempotencia: hash determinista de payload', () => {
  it('genera el mismo SHA-256 para payloads iguales y distinto para payloads diferentes', () => {
    const h1 = hashRequestPayload({ product_id: 1, quantity: 2 });
    const h2 = hashRequestPayload({ product_id: 1, quantity: 2 });
    const h3 = hashRequestPayload({ product_id: 1, quantity: 3 });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(64);
  });
});
