import { useParams, Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Store } from 'lucide-react';
import { storeApi, useRemote } from '../../shared/api/client';
import type { MarketplaceStore, StoreProductSummary } from '../../shared/api/contracts';
import { mockProducts } from '../../shared/api/mock-data';
import { ProductCard, ProductSkeleton } from '../../shared/ui/molecules/ProductCard';

export function StoreProfilePage() {
  const { slug = 'nexora-oficial' } = useParams();
  const fallbackProducts = mockProducts.filter((p) => (p.store_slug ?? 'nexora-oficial') === slug);
  const fallbackStore: MarketplaceStore | null =
    fallbackProducts.length > 0 || slug === 'nexora-oficial'
      ? {
          store_id: fallbackProducts[0]?.store_id ?? 1,
          name: fallbackProducts[0]?.store_name ?? 'NEXORA Oficial',
          slug,
          description: 'Tienda verificada del Marketplace NEXORA.',
          logo_url: null,
          banner_url: null,
          city: slug === 'friocar-pro' ? 'Caracas' : slug === 'led-tuning-ve' ? 'Maracay' : 'Valencia',
          phone: null,
          email: null,
          rating_average: 4.9,
          rating_count: 24,
          sales_count: 58,
          response_rate_pct: 98,
          is_verified: true,
          products_count: fallbackProducts.length,
        }
      : null;

  const storeState = useRemote<MarketplaceStore | null>(
    () => storeApi.storeBySlug(slug),
    fallbackStore,
    [slug],
  );
  const productsState = useRemote<{ items: readonly StoreProductSummary[] }>(
    () => storeApi.products(`?store_slug=${encodeURIComponent(slug)}&page_size=24`),
    { items: fallbackProducts },
    [slug],
  );

  const store = storeState.data;

  return (
    <>
      <section className="section section--dark section--page">
        <div className="container">
          {storeState.loading ? (
            <div className="skeleton" style={{ minHeight: '9rem' }} />
          ) : store ? (
            <div className="store-banner">
              <div className="store-banner__icon" aria-hidden="true">
                <Store size={28} />
              </div>
              <div className="store-banner__info">
                <div className="store-banner__title">
                  <h1 className="page-title">{store.name}</h1>
                  {store.is_verified && (
                    <span className="seller-verified">
                      <BadgeCheck size={15} /> Tienda Oficial / Verificada
                    </span>
                  )}
                </div>
                {store.description && <p className="muted" style={{ margin: '6px 0' }}>{store.description}</p>}
                <div className="store-banner__meta">
                  {store.city && (
                    <span><MapPin size={13} /> {store.city}</span>
                  )}
                  <span>{store.rating_average.toFixed(1)} ★ ({store.rating_count} reseñas)</span>
                  <span>{store.response_rate_pct}% tasa de respuesta</span>
                  <span>{store.products_count} productos activos</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="page-title">Tienda no encontrada</h1>
              <Link to="/catalogo" className="link-arrow link-arrow--dark">Explorar catálogo →</Link>
            </div>
          )}
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="section__head">
            <div>
              <p className="eyebrow">Catálogo de la tienda</p>
              <h2>Productos publicados</h2>
            </div>
          </div>

          <div className="prod-grid">
            {productsState.loading ? (
              Array.from({ length: 4 }, (_, i) => <ProductSkeleton key={i} />)
            ) : productsState.data.items.length === 0 ? (
              <p className="muted">Esta tienda aún no tiene productos activos.</p>
            ) : (
              productsState.data.items.map((p) => <ProductCard key={p.product_id} product={p} />)
            )}
          </div>
        </div>
      </section>
    </>
  );
}
