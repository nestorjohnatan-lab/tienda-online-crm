import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Headphones,
  ShieldCheck,
  Snowflake,
  Star,
  Truck,
} from 'lucide-react';
import { useCategories, useProducts } from '../../shared/api/client';
import { CategoryCard, CategorySkeleton } from '../../shared/ui/molecules/CategoryCard';
import { ProductCard, ProductSkeleton } from '../../shared/ui/molecules/ProductCard';
import { HeroCarousel } from './HeroCarousel';

const BENEFITS = [
  { Icon: Truck, title: 'Envíos a Todo el País', sub: 'Despacho rápido a talleres' },
  { Icon: ShieldCheck, title: 'Pagos Seguros', sub: 'Pedidos idempotentes 100%' },
  { Icon: Snowflake, title: 'Soporte Técnico A/C', sub: 'Verificación por código OEM' },
  { Icon: Award, title: 'Calidad Garantizada', sub: 'Stock real conectado al CRM' },
] as const;

const WHY_US = [
  { Icon: CheckCircle2, title: 'Repuestos Certificados', sub: 'Estándar OEM comprobado' },
  { Icon: Truck, title: 'Envío Rápido y Seguro', sub: 'Seguimiento por número de orden' },
  { Icon: Headphones, title: 'Asesoría Especializada', sub: 'Compatibilidad garantizada' },
  { Icon: Star, title: 'Confianza en Talleres', sub: 'Cientos de flotas atendidas' },
] as const;

const REVIEWS = [
  {
    text: 'El compresor llegó precargado y encajó exacto en el Corolla 2017. Enfría increíble desde el primer día.',
    name: 'Carlos M.',
    role: 'Taller ClimaAuto',
  },
  {
    text: 'Compramos cilindros R134a y filtros para nuestra flota. Despacho rápido y stock siempre real.',
    name: 'Andrea R.',
    role: 'Flota Norte',
  },
  {
    text: 'Los bombillos LED H11 y el kit de cuidado superaron la calidad esperada. Excelente atención.',
    name: 'Daniel K.',
    role: 'Cliente Web',
  },
] as const;

export function HomePage() {
  const categories = useCategories();
  const products = useProducts('?featured=true&page_size=4');

  return (
    <>
      <HeroCarousel />

      <section className="benefits">
        <div className="container benefits__grid">
          {BENEFITS.map(({ Icon, title, sub }) => (
            <div key={title} className="benefit">
              <span className="benefit__icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{sub}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--light" id="categorias">
        <div className="container">
          <header className="section__head">
            <div>
              <p className="eyebrow">Compra por categoría</p>
              <h2>Encuentra el repuesto ideal para tu vehículo</h2>
            </div>
            <Link to="/catalogo" className="link-arrow">
              Ver todo el catálogo <ArrowRight size={14} />
            </Link>
          </header>
          <div className="grid grid--cats">
            {categories.loading
              ? Array.from({ length: 6 }, (_, i) => <CategorySkeleton key={i} />)
              : categories.data.map((c) => <CategoryCard key={c.category_id} category={c} />)}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <header className="section__head">
            <div>
              <p className="eyebrow">Más vendidos</p>
              <h2>Refrigeración vehicular y accesorios top</h2>
            </div>
            <Link to="/catalogo" className="link-arrow link-arrow--dark">
              Ver todos <ArrowRight size={14} />
            </Link>
          </header>
          <div className="grid grid--prods">
            {products.loading
              ? Array.from({ length: 4 }, (_, i) => <ProductSkeleton key={i} />)
              : products.data.map((p) => <ProductCard key={p.product_id} product={p} />)}
          </div>
        </div>
      </section>

      <section className="promo">
        <div className="container promo__inner">
          <div className="promo__visual">
            <img
              src="/media/banners/promo-ac.jpg"
              alt="Sistema de climatización y compresor automotriz de precisión"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="promo__copy">
            <p className="eyebrow">Climatización &amp; desempeño</p>
            <h2>
              Haz que tu vehículo <span className="accent">rinda al máximo</span>
            </h2>
            <p>
              Compresores OEM, condensadores de aluminio e iluminación LED de alta potencia respaldados con inventario en tiempo real desde nuestro CRM.
            </p>
            <Link to="/catalogo" className="btn btn--outline">
              Explorar todos los productos <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--light why-us">
        <div className="container">
          <p className="eyebrow">Por qué elegirnos</p>
          <h2>La Diferencia AutoFrío PRO</h2>
          <div className="why-us__grid">
            {WHY_US.map(({ Icon, title, sub }) => (
              <div key={title} className="why-item">
                <span className="why-item__icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{sub}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark section--reviews">
        <div className="container">
          <header className="section__head">
            <div>
              <p className="eyebrow">Opiniones reales</p>
              <h2>Conductores y talleres reales</h2>
            </div>
            <Link to="/catalogo" className="link-arrow link-arrow--dark">
              Explorar catálogo <ArrowRight size={14} />
            </Link>
          </header>
          <div className="grid grid--reviews">
            {REVIEWS.map((r) => (
              <figure key={r.name} className="review">
                <blockquote>“{r.text}”</blockquote>
                <figcaption>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{r.role}</small>
                  </div>
                  <span className="stars" aria-label="5 de 5 estrellas">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={13} fill="currentColor" strokeWidth={2} className="stars__on" />
                    ))}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
