import { Flame, ShoppingCart, Snowflake, Sparkles, Star, Store, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl, useStoreSettings } from '../../api/client';
import type { StoreProductSummary } from '../../api/contracts';
import { useCart } from '../../cart/CartContext';

export const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency }).format(value);

export const moneyBs = (usdValue: number, bcvRate: number) =>
  `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdValue * bcvRate)}`;

const PRODUCT_FALLBACK_IMG: Record<string, string> = {
  'AC-CMP-001': '/media/products/compresor-ac.jpg',
  'AC-CND-014': '/media/products/condensador-ac.jpg',
  'AC-GAS-134': '/media/products/gas-r134a.jpg',
  'VH-LED-H11': '/media/products/led-h11.jpg',
  'VH-CAR-009': '/media/products/kit-cuidado.jpg',
};

export const getProductImage = (product: StoreProductSummary): string => {
  if (product.thumbnail_url) return resolveMediaUrl(product.thumbnail_url);
  return PRODUCT_FALLBACK_IMG[product.sku] ?? '/media/products/compresor-ac.jpg';
};

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < full ? 'currentColor' : 'none'}
          strokeWidth={2}
          className={i < full ? 'stars__on' : 'stars__off'}
        />
      ))}
    </span>
  );
}

export function ProductCard({ product }: { product: StoreProductSummary }) {
  const { add } = useCart();
  const { data: settings } = useStoreSettings();
  const cool = product.product_line === 'refrigeracion_vehicular';
  const low = product.in_stock && product.stock_quantity <= 5;
  const isTopSeller = (product.sold_count ?? 0) >= 5;
  const isTrendingSearch = !isTopSeller && (product.search_count ?? 0) >= 5;
  const imgSrc = getProductImage(product);

  return (
    <article className="prod-card">
      <Link to={`/producto/${product.slug}`} className={`prod-card__media ${cool ? 'is-cool' : 'is-warm'}`}>
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          decoding="async"
        />
        <span className={`badge ${cool ? 'badge--cool' : 'badge--warm'}`}>
          {cool ? <Snowflake size={11} /> : <Sparkles size={11} />}
          {cool ? 'A/C' : 'Vehículo'}
        </span>
        <span className={`stock ${!product.in_stock ? 'stock--out' : low ? 'stock--low' : ''}`}>
          {product.in_stock ? `Stock ${product.stock_quantity}` : 'Agotado'}
        </span>
      </Link>

      <div className="prod-card__info">
        <p className="prod-card__sku">
          {product.sku}
          {product.oem_code ? ` · OEM ${product.oem_code}` : ''}
        </p>
        <h3>
          <Link to={`/producto/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.store_name && (
          <p className="prod-card__store">
            <Store size={11} />{' '}
            <Link to={`/tienda/${product.store_slug ?? 'nexora-oficial'}`}>{product.store_name}</Link>
          </p>
        )}
        {product.vehicle_compatibility && (
          <p className="prod-card__compat">{product.vehicle_compatibility}</p>
        )}
        <p className="prod-card__rating">
          <Stars value={product.rating_average} />
          <small>({product.rating_count})</small>
          {isTopSeller && (
            <span className="prod-card__signal prod-card__signal--hot">
              <Flame size={11} /> Más vendido
            </span>
          )}
          {isTrendingSearch && (
            <span className="prod-card__signal prod-card__signal--trend">
              <TrendingUp size={11} /> Más buscado
            </span>
          )}
        </p>
      </div>

      <div className="prod-card__buy">
        <p className="price">
          {money(product.price, product.currency)}
          {product.compare_at_price && (
            <s>{money(product.compare_at_price, product.currency)}</s>
          )}
        </p>
        {settings.show_bs_prices && settings.bcv_rate > 0 && (
          <p className="price-bs">{moneyBs(product.price, settings.bcv_rate)}</p>
        )}
        <button
          className="btn btn--primary btn--block"
          disabled={!product.in_stock}
          onClick={() => add(product)}
        >
          <ShoppingCart size={15} />
          {product.in_stock ? 'Agregar al carrito' : 'Sin stock'}
        </button>
      </div>
    </article>
  );
}

export function ProductSkeleton() {
  return <div className="skeleton skeleton--prod" aria-hidden="true" />;
}
