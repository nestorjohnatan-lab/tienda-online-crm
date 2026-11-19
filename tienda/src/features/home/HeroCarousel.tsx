import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '../../shared/api/client';

const BANNER_FALLBACKS = [
  '/media/banners/hero-refrigeracion.jpg',
  '/media/banners/hero-accesorios.jpg',
  '/media/banners/promo-ac.jpg',
];

export function HeroCarousel() {
  const { data: banners, loading } = useBanners();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || banners.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [paused, banners.length]);

  useEffect(() => {
    if (index >= banners.length) setIndex(0);
  }, [banners.length, index]);

  if (loading) return <section className="hero hero--skeleton skeleton" aria-busy="true" />;
  if (banners.length === 0) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + banners.length) % banners.length);

  return (
    <section
      className="hero"
      aria-roledescription="carrusel"
      aria-label="Promociones destacadas"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
    >
      {banners.map((b, i) => {
        const bgUrl = BANNER_FALLBACKS[i % BANNER_FALLBACKS.length] ?? b.image_url;
        return (
          <div
            key={b.banner_id}
            className={`hero__slide ${i === index ? 'is-active' : ''}`}
            aria-hidden={i !== index}
            role="group"
            aria-label={`${i + 1} de ${banners.length}`}
          >
            <img
              src={bgUrl}
              alt={b.image_alt || b.title}
              className="hero__img"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <div className="hero__scrim" aria-hidden="true" />
            <div className="container hero__content">
              {b.badge_text && (
                <p className="eyebrow eyebrow--hero">
                  <span className="eyebrow__dot" aria-hidden="true" />
                  {b.badge_text}
                </p>
              )}
              <h1>
                {b.title}
                {b.highlight_text && (
                  <>
                    <br />
                    <span className="accent">{b.highlight_text}</span>
                  </>
                )}
              </h1>
              {b.subtitle && <p className="hero__sub">{b.subtitle}</p>}
              <Link
                to={b.cta_url}
                className="btn btn--primary btn--pill"
                tabIndex={i === index ? 0 : -1}
              >
                {b.cta_label}
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        );
      })}

      {banners.length > 1 && (
        <div className="container hero__controls">
          <div className="hero__dots">
            {banners.map((b, i) => (
              <button
                key={b.banner_id}
                className={i === index ? 'is-active' : ''}
                aria-label={`Ir al banner ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <div className="hero__arrows">
            <button onClick={() => go(-1)} aria-label="Banner anterior">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(1)} aria-label="Banner siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
