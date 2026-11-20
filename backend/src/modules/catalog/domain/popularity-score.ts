/**
 * Algoritmo de puntuación de popularidad para destacar productos en tienda.
 * Combina demanda real (ventas), intención (búsquedas), prueba social (rating) y disponibilidad.
 */

export interface PopularityMetrics {
  readonly soldCount: number;
  readonly searchCount: number;
  readonly ratingAverage: number;
  readonly ratingCount: number;
  readonly isFeatured: boolean;
  readonly inStock: boolean;
}

export function computePopularityScore(metrics: PopularityMetrics): number {
  const sold = Math.max(0, metrics.soldCount);
  const searched = Math.max(0, metrics.searchCount);
  const ratingAvg = Math.max(0, metrics.ratingAverage);
  const ratingCnt = Math.max(0, metrics.ratingCount);

  const salesSignal = sold * 3.0;
  const searchSignal = searched * 1.2;
  const ratingSignal = ratingAvg * Math.log(1 + ratingCnt) * 0.8;
  const featuredBoost = metrics.isFeatured ? 5 : 0;

  const raw = salesSignal + searchSignal + ratingSignal + featuredBoost;
  const adjusted = metrics.inStock ? raw : raw * 0.35;

  return Math.round(adjusted * 100) / 100;
}

export function normalizeSearchTerm(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  if (cleaned.length < 2) return null;
  return cleaned.slice(0, 120);
}
