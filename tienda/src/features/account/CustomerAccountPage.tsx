import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, MessageSquare, Star, User } from 'lucide-react';
import { storeApi } from '../../shared/api/client';
import { useCustomerAuth } from '../../shared/auth/CustomerAuthContext';
import { money } from '../../shared/ui/molecules/ProductCard';

interface CustomerOrderSummary {
  order_id: number;
  order_number: string;
  order_status: string;
  total_amount: number;
  currency: string;
  store_name: string;
  created_at: string;
  items: readonly { product_id: number; product_name: string; quantity: number }[];
}

export function CustomerAccountPage() {
  const { user, accessToken, booting, login, register, logout } = useCustomerAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<readonly CustomerOrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Estado para calificar producto desde la cuenta
  const [reviewTarget, setReviewTarget] = useState<{
    order_number: string;
    product_id: number;
    product_name: string;
  } | null>(null);
  const [prodRating, setProdRating] = useState(5);
  const [sellerRating, setSellerRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revMsg, setRevMsg] = useState<string | null>(null);
  const [revErr, setRevErr] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    storeApi
      .myOrders(accessToken)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [accessToken]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          shipping_address: address.trim(),
          city: city.trim(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || !accessToken) return;
    setBusy(true);
    setRevErr(null);
    setRevMsg(null);
    try {
      await storeApi.createReview(
        reviewTarget.product_id,
        {
          order_number: reviewTarget.order_number,
          product_rating: prodRating,
          seller_rating: sellerRating,
          title: revTitle.trim() || undefined,
          comment: revComment.trim(),
        },
        accessToken,
      );
      setRevMsg(`¡Reseña publicada para ${reviewTarget.product_name}!`);
      setReviewTarget(null);
      setRevTitle('');
      setRevComment('');
    } catch (err) {
      setRevErr(err instanceof Error ? err.message : 'No se pudo publicar la reseña');
    } finally {
      setBusy(false);
    }
  };

  if (booting) {
    return (
      <section className="section section--dark section--page">
        <div className="container"><div className="skeleton" style={{ minHeight: '14rem' }} /></div>
      </section>
    );
  }

  return (
    <section className="section section--dark section--page">
      <div className="container" style={{ maxWidth: user ? '52rem' : '28rem' }}>
        <p className="eyebrow">Cuenta de Cliente · NEXORA</p>
        <h1 className="page-title"><User size={24} style={{ verticalAlign: 'middle' }} /> Mi Cuenta</h1>

        {!user ? (
          <form className="seller-card auth-card form" onSubmit={handleAuth} style={{ marginTop: '1.25rem' }}>
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === 'login' ? 'is-active' : ''}`}
                onClick={() => setMode('login')}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'register' ? 'is-active' : ''}`}
                onClick={() => setMode('register')}
              >
                Crear cuenta
              </button>
            </div>

            {mode === 'register' && (
              <>
                <label>
                  Nombre completo *
                  <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>
                <label>
                  Teléfono / WhatsApp *
                  <input required minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label>
                  Ciudad *
                  <input required minLength={2} value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
                <label>
                  Dirección de envío *
                  <input required minLength={4} value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
              </>
            )}

            <label>
              Correo electrónico *
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </label>
            <label>
              Contraseña (mín. 6 caracteres) *
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </label>

            {error && <p className="form__error">{error}</p>}
            <button className="btn btn--primary auth-card__submit" disabled={busy}>
              {busy ? 'Procesando…' : mode === 'login' ? 'Ingresar a mi cuenta' : 'Crear mi cuenta'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1rem' }}>
            <div className="seller-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>{user.full_name}</strong>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.84rem' }}>{user.email}</p>
              </div>
              <button className="btn btn--outline btn--sm" onClick={() => void logout()}>
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>

            {revMsg && <p className="pdp-feedback">{revMsg}</p>}
            {revErr && <p className="pdp-error">{revErr}</p>}

            {reviewTarget && (
              <form className="seller-card form" onSubmit={handleReviewSubmit}>
                <h3 style={{ marginTop: 0 }}>
                  <Star size={16} style={{ verticalAlign: 'middle' }} /> Calificar: {reviewTarget.product_name}
                </h3>
                <small className="muted">Pedido {reviewTarget.order_number}</small>
                <div className="pdp-form__grid">
                  <label>
                    Calidad del producto (1-5 ★)
                    <select value={prodRating} onChange={(e) => setProdRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrellas</option>)}
                    </select>
                  </label>
                  <label>
                    Atención de la tienda (1-5 ★)
                    <select value={sellerRating} onChange={(e) => setSellerRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrellas</option>)}
                    </select>
                  </label>
                </div>
                <input
                  placeholder="Título breve (opcional)"
                  value={revTitle}
                  onChange={(e) => setRevTitle(e.target.value)}
                />
                <textarea
                  required
                  minLength={5}
                  rows={2}
                  placeholder="Cuéntanos tu experiencia con el producto y la atención recibida..."
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                />
                <div className="pdp-form__row">
                  <button className="btn btn--primary btn--sm" disabled={busy}>
                    {busy ? 'Publicando…' : 'Publicar reseña'}
                  </button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => setReviewTarget(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="seller-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Mis Compras y Reseñas</h2>
                <Link to="/mis-compras" className="link-arrow link-arrow--dark">
                  <MessageSquare size={14} /> Chat de pedidos →
                </Link>
              </div>
              {ordersLoading ? (
                <p className="muted">Cargando tus pedidos…</p>
              ) : orders.length === 0 ? (
                <p className="muted">Aún no tienes compras registradas con este correo. <Link to="/catalogo" style={{ color: 'var(--color-accent-primary)' }}>Explorar catálogo →</Link></p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {orders.map((o) => (
                    <div key={o.order_id} style={{ padding: '0.75rem', border: '1px solid var(--color-border-dark)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <strong>{o.order_number} · {o.store_name}</strong>
                        <span>{money(o.total_amount, o.currency)} · <b>{o.order_status}</b></span>
                      </div>
                      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                        {o.items.map((item) => (
                          <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <small className="muted">{item.quantity}x {item.product_name}</small>
                            {o.order_status !== 'cancelado' && (
                              <button
                                type="button"
                                className="btn btn--outline btn--sm"
                                onClick={() =>
                                  setReviewTarget({
                                    order_number: o.order_number,
                                    product_id: item.product_id,
                                    product_name: item.product_name,
                                  })
                                }
                              >
                                Dejar reseña
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
