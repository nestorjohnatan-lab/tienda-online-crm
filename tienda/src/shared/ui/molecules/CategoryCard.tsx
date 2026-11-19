import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { StoreCategory } from '../../api/contracts';

const FALLBACK_IMAGES: Record<string, string> = {
  'compresores-ac': '/media/products/compresor-ac.jpg',
  'condensadores-evaporadores': '/media/products/condensador-ac.jpg',
  'gases-aceites-refrigerantes': '/media/products/gas-r134a.jpg',
  'filtros-valvulas-ac': '/media/banners/promo-ac.jpg',
  'iluminacion-led': '/media/products/led-h11.jpg',
  'accesorios-cuidado': '/media/products/kit-cuidado.jpg',
};

export function CategoryCard({ category }: { category: StoreCategory }) {
  const cool = category.product_line === 'refrigeracion_vehicular';
  const imgSrc = FALLBACK_IMAGES[category.slug] ?? category.image_url ?? '/media/products/compresor-ac.jpg';

  return (
    <Link
      to={`/catalogo?categoria=${category.slug}`}
      className={`cat-card ${cool ? 'cat-card--cool' : 'cat-card--warm'}`}
    >
      <div className="cat-card__visual">
        <img
          src={imgSrc}
          alt={category.name}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="cat-card__body">
        <h3>{category.name}</h3>
        <p>{category.subtitle ?? 'Ver repuestos'}</p>
      </div>
      <span className="cat-card__arrow" aria-hidden="true">
        <ArrowRight size={14} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

export function CategorySkeleton() {
  return <div className="skeleton skeleton--cat" aria-hidden="true" />;
}
