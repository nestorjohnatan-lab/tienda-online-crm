import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle2,
  MessageCircleQuestion,
  ShoppingCart,
  Star,
  Store,
} from 'lucide-react';
import { resolveMediaUrl, storeApi, useStoreSettings } from '../../shared/api/client';
import type { ProductDetail, ProductQuestion, ProductReview } from '../../shared/api/contracts';
import { getMockProductDetail, mockQuestions, mockReviews } from '../../shared/api/mock-data';
import { useCart } from '../../shared/cart/CartContext';
import { useCustomerAuth } from '../../shared/auth/CustomerAuthContext';
import { getProductImage, money, moneyBs } from '../../shared/ui/molecules/ProductCard';

function RatingStars({ value, size = 15 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < full ? 'currentColor' : 'none'}
          className={i < full ? 'stars__on' : 'stars__off'}
        />
      ))}
    </span>
  );
}

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { add } = useCart();
  const { user, accessToken } = useCustomerAuth();
  const { data: settings } = useStoreSettings();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [questions, setQuestions] = useState<readonly ProductQuestion[]>([]);
  const [reviews, setReviews] = useState<readonly ProductReview[]>([]);
  const [activeImg, setActiveImg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Q&A (solo autenticado)
  const [qText, setQText] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [qMsg, setQMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    storeApi
      .productBySlug(slug)
      .then(async (p) => {
        if (cancelled) return;
        setProduct(p);
        const firstImg = p.images[0]?.image_url
          ? resolveMediaUrl(p.images[0].image_url)
          : getProductImage(p);
        setActiveImg(firstImg);

        const [qs, revs] = await Promise.all([
          storeApi.productQuestions(p.product_id).catch(() => mockQuestions),
          storeApi.productReviews(p.product_id).catch(() => mockReviews),
        ]);
        if (!cancelled) {
          setQuestions(qs);
          setReviews(revs);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const fallback = getMockProductDetail(slug);
        if (fallback) {
          setProduct(fallback);
          setActiveImg(fallback.images[0]?.image_url ?? getProductImage(fallback));
          setQuestions(mockQuestions);
          setReviews(mockReviews);
        } else {
          setError(err instanceof Error ? err.message : 'Producto no encontrado');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!product || !accessToken) return;
    setQBusy(true);
    setQMsg(null);
    try {
      const created = await storeApi.askQuestion(product.product_id, qText, accessToken);
      setQuestions((prev) => [created, ...prev]);
      setQText('');
      setQMsg('¡Pregunta enviada! La tienda te responderá pronto.');
    } catch (err) {
      setQMsg(err instanceof Error ? err.message : 'No se pudo enviar la pregunta');
    } finally {
      setQBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="section section--dark section--page">
        <div className="container">
          <div className="skeleton" style={{ minHeight: '24rem' }} />
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="section section--dark section--page">
        <div className="container">
          <h1 className="page-title">Producto no disponible</h1>
          <p className="muted">{error ?? 'No encontramos este artículo.'}</p>
          <Link to="/catalogo" className="link-arrow link-arrow--dark">Volver al catálogo →</Link>
        </div>
      </section>
    );
  }

  const gallery = product.images.length > 0
    ? product.images.map((img) => resolveMediaUrl(img.image_url))
    : [getProductImage(product)];

  return (
    <>
      <section className="section section--dark section--page">
        <div className="container">
          <p className="eyebrow">
            <Link to="/catalogo">Catálogo</Link> · {product.category_name}
          </p>

          <div className="pdp-grid">
            {/* Galería multi-foto */}
            <div className="pdp-gallery">
              <div className="pdp-gallery__main">
                <img src={activeImg || gallery[0]} alt={product.name} />
              </div>
              {gallery.length > 1 && (
                <div className="pdp-gallery__thumbs">
                  {gallery.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      className={`pdp-thumb ${activeImg === url ? 'is-active' : ''}`}
                      onClick={() => setActiveImg(url)}
                    >
                      <img src={url} alt={`${product.name} vista ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info principal + Tarjeta de Tienda */}
            <div className="pdp-info">
              <p className="prod-card__sku">
                SKU {product.sku}
                {product.oem_code ? ` · OEM ${product.oem_code}` : ''}
                {product.brand ? ` · ${product.brand}` : ''}
              </p>
              <h1 className="page-title" style={{ marginTop: 4 }}>{product.name}</h1>

              <div className="pdp-rating-row">
                <RatingStars value={product.rating_average} />
                <span>{product.rating_average.toFixed(1)} ({product.rating_count} reseñas)</span>
                {(product.sold_count ?? 0) > 0 && <span>· {product.sold_count} vendidos</span>}
              </div>

              <div className="pdp-price-box">
                <p className="price" style={{ fontSize: '1.85rem' }}>
                  {money(product.price, product.currency)}
                  {product.compare_at_price && (
                    <s>{money(product.compare_at_price, product.currency)}</s>
                  )}
                </p>
                {settings.show_bs_prices && settings.bcv_rate > 0 && (
                  <p className="price-bs">{moneyBs(product.price, settings.bcv_rate)}</p>
                )}
              </div>

              {product.short_description && <p className="pdp-desc">{product.short_description}</p>}
              {product.description && <p className="pdp-desc muted">{product.description}</p>}

              <div className="pdp-actions">
                <span className={`stock ${!product.in_stock ? 'stock--out' : ''}`}>
                  {product.in_stock ? `Disponible (${product.stock_quantity} unid.)` : 'Agotado'}
                </span>
                <button
                  className="btn btn--primary btn--pill"
                  disabled={!product.in_stock}
                  onClick={() => add(product)}
                >
                  <ShoppingCart size={16} />
                  {product.in_stock ? 'Agregar al carrito' : 'Sin stock'}
                </button>
              </div>

              {/* Tarjeta de la Tienda Vendedora (estilo MercadoLibre / Shopee) */}
              <div className="seller-card">
                <div className="seller-card__head">
                  <div className="seller-card__title">
                    <Store size={18} />
                    <div>
                      <Link to={`/tienda/${product.store.slug}`}>
                        <strong>{product.store.name}</strong>
                      </Link>
                      {product.store.is_verified && (
                        <span className="seller-verified">
                          <BadgeCheck size={14} /> Tienda verificada
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/tienda/${product.store.slug}`} className="btn btn--outline btn--sm">
                    Ver tienda
                  </Link>
                </div>
                <div className="seller-card__metrics">
                  <div>
                    <strong>{product.store.rating_average.toFixed(1)} ★</strong>
                    <small>Atención ({product.store.rating_count})</small>
                  </div>
                  <div>
                    <strong>{product.store.response_rate_pct}%</strong>
                    <small>Responde rápido</small>
                  </div>
                  <div>
                    <strong>{product.store.city ?? 'Nacional'}</strong>
                    <small>Ubicación</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Q&A (Preguntas y Respuestas) */}
      <section className="section section--light">
        <div className="container pdp-split">
          <div>
            <p className="eyebrow">Preguntas al vendedor</p>
            <h2><MessageCircleQuestion size={20} style={{ verticalAlign: 'middle' }} /> Preguntas y respuestas</h2>

            {user && accessToken ? (
              <form className="pdp-form" onSubmit={handleAskQuestion}>
                <div className="pdp-form__row">
                  <input
                    required
                    minLength={5}
                    placeholder={`Pregunta como ${user.full_name} sobre compatibilidad, garantía o envío...`}
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <button className="btn btn--primary" disabled={qBusy}>
                    {qBusy ? 'Enviando…' : 'Preguntar'}
                  </button>
                </div>
                {qMsg && <p className="pdp-feedback">{qMsg}</p>}
              </form>
            ) : (
              <div className="pdp-form pdp-form--card">
                <p style={{ margin: 0, fontSize: '0.86rem' }}>
                  Inicia sesión o crea tu cuenta de cliente para hacer preguntas a la tienda.{' '}
                  <Link to="/mi-cuenta" style={{ color: 'var(--color-accent-primary)', fontWeight: 700 }}>
                    Ir a Mi Cuenta →
                  </Link>
                </p>
              </div>
            )}

            <div className="qa-list">
              {questions.length === 0 ? (
                <p className="muted">Todavía no hay preguntas. ¡Sé el primero en consultar a la tienda!</p>
              ) : (
                questions.map((q) => (
                  <article key={q.question_id} className="qa-item">
                    <p className="qa-item__q">
                      <strong>{q.customer_name}:</strong> {q.question_text}
                    </p>
                    {q.answer_text ? (
                      <p className="qa-item__a">
                        <span>Respuesta de {product.store.name}:</span> {q.answer_text}
                      </p>
                    ) : (
                      <p className="qa-item__pending">Pendiente de respuesta de la tienda</p>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>

          {/* Reseñas Verificadas de Compradores (solo historial público; escribir desde Mi Cuenta) */}
          <div>
            <p className="eyebrow">Opiniones de compradores</p>
            <h2>Reseñas del producto y atención</h2>

            <div className="pdp-form pdp-form--card">
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Solo los clientes verificados pueden publicar reseñas desde su historial de compras.{' '}
                <Link to="/mi-cuenta" style={{ color: 'var(--color-accent-primary)', fontWeight: 700 }}>
                  {user ? 'Calificar desde Mis Compras →' : 'Inicia sesión en Mi Cuenta →'}
                </Link>
              </p>
            </div>

            <div className="rev-list">
              {reviews.length === 0 ? (
                <p className="muted">Aún no hay reseñas verificadas para este producto.</p>
              ) : (
                reviews.map((r) => (
                  <article key={r.review_id} className="rev-item">
                    <div className="rev-item__head">
                      <div>
                        <strong>{r.reviewer_name}</strong>
                        {r.is_verified_purchase && (
                          <span className="rev-verified">
                            <CheckCircle2 size={12} /> Compra verificada
                          </span>
                        )}
                      </div>
                      <RatingStars value={r.product_rating} size={13} />
                    </div>
                    {r.title && <h4 style={{ margin: '6px 0 4px' }}>{r.title}</h4>}
                    <p style={{ margin: 0 }}>{r.comment}</p>
                    <small className="muted">Atención de la tienda: {r.seller_rating}/5 ★</small>
                    {r.seller_reply && (
                      <p className="qa-item__a" style={{ marginTop: 8 }}>
                        <span>Respuesta de {product.store.name}:</span> {r.seller_reply}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
