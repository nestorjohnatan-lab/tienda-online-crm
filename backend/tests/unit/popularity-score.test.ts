import { describe, expect, it } from 'vitest';
import {
  computePopularityScore,
  normalizeSearchTerm,
} from '../../src/modules/catalog/domain/popularity-score.js';

describe('Algoritmo de Popularidad: Más Vendidos y Más Buscados', () => {
  it('prioriza ventas reales por encima de búsquedas individuales', () => {
    const bestSeller = computePopularityScore({
      soldCount: 10,
      searchCount: 2,
      ratingAverage: 4.5,
      ratingCount: 5,
      isFeatured: false,
      inStock: true,
    });
    const searchedOnly = computePopularityScore({
      soldCount: 0,
      searchCount: 10,
      ratingAverage: 4.5,
      ratingCount: 5,
      isFeatured: false,
      inStock: true,
    });

    expect(bestSeller).toBeGreaterThan(searchedOnly);
  });

  it('penaliza productos sin stock disponible para no destacar agotados', () => {
    const inStock = computePopularityScore({
      soldCount: 12,
      searchCount: 20,
      ratingAverage: 4.8,
      ratingCount: 15,
      isFeatured: true,
      inStock: true,
    });
    const outOfStock = computePopularityScore({
      soldCount: 12,
      searchCount: 20,
      ratingAverage: 4.8,
      ratingCount: 15,
      isFeatured: true,
      inStock: false,
    });

    expect(outOfStock).toBeLessThan(inStock * 0.5);
  });

  it('retorna 0 cuando todas las métricas están en cero', () => {
    expect(
      computePopularityScore({
        soldCount: 0,
        searchCount: 0,
        ratingAverage: 0,
        ratingCount: 0,
        isFeatured: false,
        inStock: true,
      }),
    ).toBe(0);
  });

  it('normaliza términos de búsqueda y descarta consultas muy cortas', () => {
    expect(normalizeSearchTerm('  Compresor   Corolla  ')).toBe('compresor corolla');
    expect(normalizeSearchTerm('a')).toBeNull();
    expect(normalizeSearchTerm('   ')).toBeNull();
    expect(normalizeSearchTerm(undefined)).toBeNull();
  });
});
