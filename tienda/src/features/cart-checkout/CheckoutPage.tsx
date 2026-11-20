import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Copy, CreditCard, ImagePlus, Receipt, Trash2, UserCheck } from 'lucide-react';
import { authApi, storeApi, useStoreSettings } from '../../shared/api/client';
import type {
  CreateStoreOrderRequest,
  CreateStoreOrderResponse,
  StoreUser,
} from '../../shared/api/contracts';
import { useCart } from '../../shared/cart/CartContext';
import { money, moneyBs } from '../../shared/ui/molecules/ProductCard';

type CheckoutPaymentMethod = 'pago_movil' | 'transferencia' | 'zelle' | 'binance' | 'efectivo';
const DIGITAL_METHODS: readonly CheckoutPaymentMethod[] = ['pago_movil', 'transferencia', 'zelle', 'binance'];

const PAYMENT_OPTIONS: readonly { readonly value: CheckoutPaymentMethod; readonly label: string }[] = [
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'binance', label: 'Binance Pay' },
  { value: 'efectivo', label: 'Efectivo' },
];

type Step = 1 | 2 | 3;

export function CheckoutPage() {
  const { selectedLines, selectedCount, selectedTotal, clearSelected } = useCart();
  const { data: settings } = useStoreSettings();
  const idempotencyKey = useRef(crypto.randomUUID());

  const [step, setStep] = useState<Step>(1);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [user, setUser] = useState<StoreUser | null>(null);

  // Datos de contacto / envío conservados entre pasos
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('pago_movil');
  const [receiptData, setReceiptData] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CreateStoreOrderResponse | null>(null);

  useEffect(() => {
    authApi
      .refresh()
      .then((s) => {
        setUser(s.user);
        setFullName((prev) => prev || s.user.full_name);
        setEmail((prev) => prev || s.user.email);
        setPhone((prev) => prev || s.user.phone || '');
        setAddress((prev) => prev || s.user.shipping_address || '');
        setCity((prev) => prev || s.user.city || '');
        setDocumentId((prev) => prev || s.user.document_id || '');
      })
      .catch(() => undefined);
  }, []);

  if (done) {
    return (
      <section className="section section--dark section--page">
        <div className="container narrow">
          <div className="checkout-card checkout-done">
            <div className="checkout-done__icon">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="page-title">¡Pedido registrado!</h1>
            <p>
              Tu número de orden es <strong className="accent checkout-done__order">{done.order_number}</strong> por{' '}
              <strong className="tabular-nums">{money(done.total_amount, done.currency)}</strong>.
            </p>
            <p className="muted">Nuestro equipo verificará tu pago y coordinará el despacho.</p>
            <Link to="/" className="btn btn--primary btn--pill">Volver a la tienda</Link>
          </div>
        </div>
      </section>
    );
  }

  if (selectedLines.length === 0) {
    return (
      <section className="section section--dark section--page">
        <div className="container narrow">
          <h1 className="page-title">Finalizar pedido</h1>
          <p className="empty">
            No tienes productos seleccionados en tu carrito.{' '}
            <Link to="/carrito" className="link-arrow link-arrow--dark">Ir al carrito →</Link>
          </p>
        </div>
      </section>
    );
  }

  const handleStep1Submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (user) {
        setStep(2);
        return;
      }
      if (authMode === 'register') {
        const session = await authApi.register({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          document_id: documentId.trim() || null,
          shipping_address: address.trim(),
          city: city.trim(),
        });
        setUser(session.user);
        setStep(2);
      } else {
        const session = await authApi.login(email.trim(), password);
        setUser(session.user);
        setFullName(session.user.full_name);
        setEmail(session.user.email);
        setPhone((prev) => prev || session.user.phone || '');
        setAddress((prev) => prev || session.user.shipping_address || '');
        setCity((prev) => prev || session.user.city || '');
        setDocumentId((prev) => prev || session.user.document_id || '');
        setStep(2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el acceso');
    } finally {
      setBusy(false);
    }
  };

  const handleReceiptUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El comprobante debe ser una imagen (PNG, JPG o WEBP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La captura no debe superar 2 MB');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setReceiptData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const copyValue = (key: string, value: string) => {
    if (!value) return;
    void navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1600);
  };

  const handleStep3Submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const payload: CreateStoreOrderRequest = {
      customer: {
        full_name: (fullName || user?.full_name || '').trim(),
        email: (email || user?.email || '').trim(),
        phone: phone.trim(),
        ...(documentId.trim() ? { document_id: documentId.trim() } : {}),
        shipping_address: address.trim(),
        city: city.trim(),
      },
      payment_method: paymentMethod,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(receiptData ? { payment_receipt_data: receiptData } : {}),
      items: selectedLines.map((l) => ({
        product_id: l.product.product_id,
        quantity: l.quantity,
      })),
    };

    try {
      const order = await storeApi.createOrder(payload, idempotencyKey.current);
      setDone(order);
      clearSelected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pedido');
    } finally {
      setBusy(false);
    }
  };

  const qualifiesFree = selectedTotal >= settings.free_shipping_threshold;

  return (
    <section className="section section--dark section--page">
      <div className="container narrow">
        <p className="eyebrow">Checkout seguro</p>
        <h1 className="page-title">Finalizar pedido</h1>

        {/* Indicador de 3 pasos (Mobile-First) */}
        <ol className="stepper" aria-label="Pasos del checkout">
          <li className={step === 1 ? 'is-active' : step > 1 ? 'is-done' : ''}>
            <span>{step > 1 ? <Check size={13} /> : '1'}</span>
            <strong>Cuenta</strong>
          </li>
          <li className={step === 2 ? 'is-active' : step > 2 ? 'is-done' : ''}>
            <span>{step > 2 ? <Check size={13} /> : '2'}</span>
            <strong>Confirmar monto</strong>
          </li>
          <li className={step === 3 ? 'is-active' : ''}>
            <span>3</span>
            <strong>Formas de pago</strong>
          </li>
        </ol>

        {/* PASO 1: REGISTRARSE Y CREAR CUENTA */}
        {step === 1 && (
          <form className="checkout-card form" onSubmit={handleStep1Submit}>
            <div className="checkout-card__head">
              <h2><UserCheck size={18} /> Paso 1: Registro y Cuenta</h2>
              {!user && (
                <div className="auth-switch" role="tablist">
                  <button
                    type="button"
                    className={authMode === 'register' ? 'is-active' : ''}
                    onClick={() => { setAuthMode('register'); setError(null); }}
                  >
                    Crear cuenta
                  </button>
                  <button
                    type="button"
                    className={authMode === 'login' ? 'is-active' : ''}
                    onClick={() => { setAuthMode('login'); setError(null); }}
                  >
                    Ya tengo cuenta
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <>
                <div className="account-box">
                  <div>
                    <strong>{user.full_name}</strong>
                    <small>{user.email}</small>
                  </div>
                  <button
                    type="button"
                    className="amz-link"
                    onClick={() => {
                      void authApi.logout();
                      setUser(null);
                    }}
                  >
                    Usar otra cuenta
                  </button>
                </div>
                <label>
                  Teléfono de contacto
                  <input required minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0414-0000000" />
                </label>
                <label>
                  Dirección de envío
                  <input required minLength={5} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, edificio, referencia..." />
                </label>
                <label>
                  Ciudad
                  <input required minLength={2} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad Bolívar" />
                </label>
              </>
            ) : authMode === 'register' ? (
              <>
                <label>
                  Nombre completo
                  <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                </label>
                <div className="checkout-grid-2">
                  <label>
                    Correo electrónico
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </label>
                  <label>
                    Crear contraseña (mín. 6 caracteres)
                    <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                  </label>
                </div>
                <div className="checkout-grid-2">
                  <label>
                    Teléfono
                    <input type="tel" required minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                  </label>
                  <label>
                    Cédula / RIF (opcional)
                    <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="V-18234567" />
                  </label>
                </div>
                <label>
                  Dirección de envío
                  <input required minLength={5} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
                </label>
                <label>
                  Ciudad
                  <input required minLength={2} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                </label>
              </>
            ) : (
              <>
                <label>
                  Correo electrónico
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </label>
                <label>
                  Contraseña
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </label>
                <div className="checkout-grid-2">
                  <label>
                    Teléfono de entrega
                    <input type="tel" required minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label>
                    Ciudad
                    <input required minLength={2} value={city} onChange={(e) => setCity(e.target.value)} />
                  </label>
                </div>
                <label>
                  Dirección de envío
                  <input required minLength={5} value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
              </>
            )}

            {error && <p className="form__error" role="alert">{error}</p>}

            <button className="btn btn--primary btn--pill btn--block" disabled={busy}>
              {busy ? 'Procesando…' : user ? 'Continuar a Confirmar Monto →' : authMode === 'register' ? 'Crear cuenta y continuar →' : 'Iniciar sesión y continuar →'}
            </button>
          </form>
        )}

        {/* PASO 2: CONFIRMAR EL MONTO */}
        {step === 2 && (
          <div className="checkout-card form">
            <div className="checkout-card__head">
              <h2><Receipt size={18} /> Paso 2: Confirmar monto</h2>
            </div>

            <div className="confirm-lines">
              {selectedLines.map(({ product, quantity }) => (
                <div key={product.product_id} className="confirm-line">
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.sku} · Cantidad: {quantity}</small>
                  </div>
                  <strong className="num">{money(product.price * quantity, product.currency)}</strong>
                </div>
              ))}
            </div>

            <div className="confirm-totals">
              <div><span>Productos ({selectedCount})</span><strong className="num">{money(selectedTotal, settings.currency)}</strong></div>
              <div><span>Envío</span><strong className={qualifiesFree ? 'is-free-txt' : ''}>{qualifiesFree ? 'GRATIS' : 'Por coordinar'}</strong></div>
              <div className="confirm-totals__grand">
                <span>Monto total a pagar</span>
                <div>
                  <strong className="num">{money(selectedTotal, settings.currency)}</strong>
                  {settings.show_bs_prices && settings.bcv_rate > 0 && (
                    <span className="price-bs">
                      {moneyBs(selectedTotal, settings.bcv_rate)} (Tasa BCV: {settings.bcv_rate})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="confirm-ship">
              Entrega para <strong>{fullName || user?.full_name}</strong> · {address}, {city} ({phone})
            </p>

            <div className="checkout-actions">
              <button type="button" className="btn btn--outline" onClick={() => setStep(1)}>
                <ArrowLeft size={15} /> Volver
              </button>
              <button type="button" className="btn btn--primary btn--pill" onClick={() => setStep(3)}>
                Confirmar monto e ir a pagar →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: FORMAS DE PAGO */}
        {step === 3 && (
          <form className="checkout-card form" onSubmit={handleStep3Submit}>
            <div className="checkout-card__head">
              <h2><CreditCard size={18} /> Paso 3: Formas de pago</h2>
            </div>

            <div className="pay-banner">
              <span>Monto confirmado</span>
              <div>
                <strong className="num">{money(selectedTotal, settings.currency)}</strong>
                {settings.show_bs_prices && settings.bcv_rate > 0 && (
                  <small className="price-bs">
                    {moneyBs(selectedTotal, settings.bcv_rate)} (Tasa BCV: {settings.bcv_rate})
                  </small>
                )}
              </div>
            </div>

            <fieldset className="pay-methods">
              <legend>Selecciona cómo deseas pagar</legend>
              <div className="pay-methods__grid">
                {PAYMENT_OPTIONS.filter((opt) => {
                  if (opt.value === 'efectivo') return true;
                  return settings.payment_accounts[opt.value]?.enabled ?? true;
                }).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={paymentMethod === m.value}
                    className={`pay-option ${paymentMethod === m.value ? 'is-active' : ''}`}
                    onClick={() => setPaymentMethod(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Datos de pago digital configurados en el CRM + subida de captura */}
            {DIGITAL_METHODS.includes(paymentMethod) && (
              <div className="pay-digital-box">
                <div className="pay-details">
                  <strong>Datos para realizar tu pago</strong>
                  {paymentMethod === 'pago_movil' && (
                    <ul>
                      <li><span>Banco:</span> <b>{settings.payment_accounts.pago_movil.bank || 'Por configurar en CRM'}</b></li>
                      <li>
                        <span>Teléfono:</span>
                        <b>{settings.payment_accounts.pago_movil.phone || '—'}</b>
                        {settings.payment_accounts.pago_movil.phone && (
                          <button type="button" className={`copy-btn ${copiedField === 'pm-tel' ? 'is-copied' : ''}`} onClick={() => copyValue('pm-tel', settings.payment_accounts.pago_movil.phone)}>
                            {copiedField === 'pm-tel' ? <Check size={12} /> : <Copy size={12} />} {copiedField === 'pm-tel' ? 'Copiado' : 'Copiar'}
                          </button>
                        )}
                      </li>
                      <li>
                        <span>Cédula / RIF:</span>
                        <b>{settings.payment_accounts.pago_movil.document_id || '—'}</b>
                        {settings.payment_accounts.pago_movil.document_id && (
                          <button type="button" className={`copy-btn ${copiedField === 'pm-doc' ? 'is-copied' : ''}`} onClick={() => copyValue('pm-doc', settings.payment_accounts.pago_movil.document_id)}>
                            {copiedField === 'pm-doc' ? <Check size={12} /> : <Copy size={12} />} {copiedField === 'pm-doc' ? 'Copiado' : 'Copiar'}
                          </button>
                        )}
                      </li>
                      {settings.payment_accounts.pago_movil.holder_name && (
                        <li><span>Titular:</span> <b>{settings.payment_accounts.pago_movil.holder_name}</b></li>
                      )}
                    </ul>
                  )}

                  {paymentMethod === 'transferencia' && (
                    <ul>
                      <li><span>Banco:</span> <b>{settings.payment_accounts.transferencia.bank || 'Por configurar en CRM'}</b> ({settings.payment_accounts.transferencia.account_type})</li>
                      <li>
                        <span>Cuenta:</span>
                        <b className="mono">{settings.payment_accounts.transferencia.account_number || '—'}</b>
                        {settings.payment_accounts.transferencia.account_number && (
                          <button type="button" className={`copy-btn ${copiedField === 'tr-acc' ? 'is-copied' : ''}`} onClick={() => copyValue('tr-acc', settings.payment_accounts.transferencia.account_number)}>
                            {copiedField === 'tr-acc' ? <Check size={12} /> : <Copy size={12} />} {copiedField === 'tr-acc' ? 'Copiado' : 'Copiar'}
                          </button>
                        )}
                      </li>
                      <li><span>Cédula / RIF:</span> <b>{settings.payment_accounts.transferencia.document_id || '—'}</b></li>
                      {settings.payment_accounts.transferencia.holder_name && (
                        <li><span>Titular:</span> <b>{settings.payment_accounts.transferencia.holder_name}</b></li>
                      )}
                    </ul>
                  )}

                  {paymentMethod === 'zelle' && (
                    <ul>
                      <li>
                        <span>Correo Zelle:</span>
                        <b>{settings.payment_accounts.zelle.email || 'Por configurar en CRM'}</b>
                        {settings.payment_accounts.zelle.email && (
                          <button type="button" className={`copy-btn ${copiedField === 'zl-mail' ? 'is-copied' : ''}`} onClick={() => copyValue('zl-mail', settings.payment_accounts.zelle.email)}>
                            {copiedField === 'zl-mail' ? <Check size={12} /> : <Copy size={12} />} {copiedField === 'zl-mail' ? 'Copiado' : 'Copiar'}
                          </button>
                        )}
                      </li>
                      {settings.payment_accounts.zelle.holder_name && (
                        <li><span>Titular:</span> <b>{settings.payment_accounts.zelle.holder_name}</b></li>
                      )}
                    </ul>
                  )}

                  {paymentMethod === 'binance' && (
                    <ul>
                      <li>
                        <span>Binance Pay ID:</span>
                        <b className="mono">{settings.payment_accounts.binance.pay_id || 'Por configurar en CRM'}</b>
                        {settings.payment_accounts.binance.pay_id && (
                          <button type="button" className={`copy-btn ${copiedField === 'bn-id' ? 'is-copied' : ''}`} onClick={() => copyValue('bn-id', settings.payment_accounts.binance.pay_id)}>
                            {copiedField === 'bn-id' ? <Check size={12} /> : <Copy size={12} />} {copiedField === 'bn-id' ? 'Copiado' : 'Copiar'}
                          </button>
                        )}
                      </li>
                      {settings.payment_accounts.binance.email && (
                        <li><span>Correo:</span> <b>{settings.payment_accounts.binance.email}</b></li>
                      )}
                      {settings.payment_accounts.binance.holder_name && (
                        <li><span>Alias / Titular:</span> <b>{settings.payment_accounts.binance.holder_name}</b></li>
                      )}
                    </ul>
                  )}
                </div>

                {/* Subida de captura de comprobante */}
                <div className="receipt-upload">
                  <span className="receipt-upload__label">Captura / comprobante de pago</span>
                  {receiptData ? (
                    <div className="receipt-preview">
                      <img src={receiptData} alt="Comprobante de pago adjunto" />
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => setReceiptData(null)}>
                        <Trash2 size={14} /> Quitar captura
                      </button>
                    </div>
                  ) : (
                    <label className="receipt-drop">
                      <ImagePlus size={20} />
                      <span>Toca para subir la captura del comprobante (PNG/JPG, máx. 2 MB)</span>
                      <input type="file" accept="image/*" onChange={handleReceiptUpload} />
                    </label>
                  )}
                </div>
              </div>
            )}

            <label>
              Nota o referencia de pago (opcional)
              <input
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Banco destino, horario de entrega..."
              />
            </label>

            {error && <p className="form__error" role="alert">{error}</p>}

            <div className="checkout-actions">
              <button type="button" className="btn btn--outline" onClick={() => setStep(2)}>
                <ArrowLeft size={15} /> Volver
              </button>
              <button type="submit" className="btn btn--primary btn--pill" disabled={busy}>
                {busy ? 'Confirmando pedido…' : 'Confirmar y finalizar pedido'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
