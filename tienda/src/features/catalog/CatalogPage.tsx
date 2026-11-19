import { useSearchParams } from 'react-router-dom';
import { useCategories, useProducts } from '../../shared/api/client';
import { ProductCard, ProductSkeleton } from '../../shared/ui/molecules/ProductCard';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const linea = params.get('linea') ?? '';
  const categoria = params.get('categoria') ?? '';
  const q = params.get('q') ?? '';

  const qs = new URLSearchParams();
  if (linea) qs.set('product_line', linea);
  if (categoria) qs.set('category_slug', categoria);
  if (q) qs.set('q', q);
  qs.set('page_size', '24');

  const categories = useCategories();
  const products = useProducts(`?${qs.toString()}`);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'linea') next.delete('categoria');
    setParams(next, { replace: true });
  };

  // Respaldo mock: el filtrado se aplica en el cliente solo si la API no respondió
  const items = products.isFallback
    ? products.data.filter(
        (p) =>
          (!linea || p.product_line === linea) &&
          (!categoria || categories.data.find((c) => c.slug === categoria)?.category_id === p.category_id) &&
          (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())),
      )
    : products.data;

  return (
    <section className="section section--dark section--page">
      <div className="container">
        <p className="eyebrow">Catálogo</p>
        <h1 className="page-title">Refrigeración vehicular y variados</h1>

        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            placeholder="Buscar compresor, R134a, LED…"
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
          <select value={categoria} onChange={(e) => update('categoria', e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories.data
              .filter((c) => !linea || c.product_line === linea)
              .map((c) => (
                <option key={c.category_id} value={c.slug}>{c.name}</option>
              ))}
          </select>
        </form>

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
