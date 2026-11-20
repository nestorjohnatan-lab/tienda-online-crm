import { TrendingUp } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCategories, useProducts, useTrendingSearches } from '../../shared/api/client';
import { ProductCard, ProductSkeleton } from '../../shared/ui/molecules/ProductCard';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Ordenar: Relevancia y popularidad' },
  { value: 'bestsellers', label: 'Más vendidos' },
  { value: 'most_searched', label: 'Más buscados' },
  { value: 'rating_desc', label: 'Mejor valorados' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'newest', label: 'Más recientes' },
] as const;

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const linea = params.get('linea') ?? '';
  const categoria = params.get('categoria') ?? '';
  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'popular';

  const qs = new URLSearchParams();
  if (linea) qs.set('product_line', linea);
  if (categoria) qs.set('category_slug', categoria);
  if (q) qs.set('q', q);
  qs.set('sort', sort);
  qs.set('page_size', '24');

  const categories = useCategories();
  const products = useProducts(`?${qs.toString()}`);
  const trending = useTrendingSearches(6);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'linea') next.delete('categoria');
    setParams(next, { replace: true });
  };

  // Respaldo mock: filtrado y ordenamiento en el cliente solo si la API no respondió
  const items = products.isFallback
    ? products.data
      .filter(
        (p) =>
          (!linea || p.product_line === linea) &&
          (!categoria || categories.data.find((c) => c.slug === categoria)?.category_id === p.category_id) &&
          (!q || `${p.name} ${p.sku} ${p.vehicle_compatibility ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      )
      .sort((a, b) => {
        if (sort === 'bestsellers') return (b.sold_count ?? 0) - (a.sold_count ?? 0);
        if (sort === 'most_searched') return (b.search_count ?? 0) - (a.search_count ?? 0);
        if (sort === 'price_asc') return a.price - b.price;
        if (sort === 'price_desc') return b.price - a.price;
        if (sort === 'rating_desc') return b.rating_average - a.rating_average;
        return (b.popularity_score ?? 0) - (a.popularity_score ?? 0);
      })
    : products.data;

  return (
    <section className="section section--dark section--page">
      <div className="container">
        <p className="eyebrow">Marketplace</p>
        <h1 className="page-title">Explora el catálogo NEXORA</h1>

        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            placeholder="Buscar productos, marcas, SKU…"
            value={q}
            onChange={(e) => update('q', e.target.value)}
            aria-label="Buscar productos"
          />
          <div className="chips" role="group" aria-label="Línea de producto">
            {(
              [
                ['', 'Todos'],
                ['refrigeracion_vehicular', '❄ Refrigeración A/C'],
                ['variados_vehiculos', 'Variados'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`chip ${linea === value ? 'is-active' : ''}`}
                onClick={() => update('linea', value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="filters__selects">
            <select value={categoria} onChange={(e) => update('categoria', e.target.value)} aria-label="Categoría">
              <option value="">Todas las categorías</option>
              {categories.data
                .filter((c) => !linea || c.product_line === linea)
                .map((c) => (
                  <option key={c.category_id} value={c.slug}>{c.name}</option>
                ))}
            </select>
            <select value={sort} onChange={(e) => update('sort', e.target.value)} aria-label="Ordenar catálogo">
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </form>

        {trending.data.length > 0 && (
          <div className="trending-bar" aria-label="Búsquedas populares">
            <span className="trending-bar__label">
              <TrendingUp size={13} /> Más buscados:
            </span>
            {trending.data.map((t) => (
              <button
                key={t.term}
                type="button"
                className={`trending-chip ${q.toLowerCase() === t.term.toLowerCase() ? 'is-active' : ''}`}
                onClick={() => update('q', q.toLowerCase() === t.term.toLowerCase() ? '' : t.term)}
              >
                {t.term}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid--prods">
          {products.loading
            ? Array.from({ length: 8 }, (_, i) => <ProductSkeleton key={i} />)
            : items.map((p) => <ProductCard key={p.product_id} product={p} />)}
        </div>
        {!products.loading && items.length === 0 && <p className="empty">No se encontraron productos con esos filtros.</p>}
      </div>
    </section>
  );
}
