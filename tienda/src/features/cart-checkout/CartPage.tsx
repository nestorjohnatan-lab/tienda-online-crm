import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, CheckCircle2, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useStoreSettings } from '../../shared/api/client';
import { useCart } from '../../shared/cart/CartContext';
import { getProductImage, money, moneyBs } from '../../shared/ui/molecules/ProductCard';

export function CartPage() {
  const {
    lines,
    saved,
    selectedCount,
    selectedTotal,
    allSelected,
    setQty,
    remove,
    toggleSelect,
    toggleAll,
    saveForLater,
    moveToCart,
    removeSaved,
  } = useCart();
  const navigate = useNavigate();

  const { data: settings } = useStoreSettings();
  const threshold = settings.free_shipping_threshold;
  const remainingForFreeShipping = Math.max(0, threshold - selectedTotal);
  const freeShippingProgress = threshold > 0 ? Math.min(100, (selectedTotal / threshold) * 100) : 100;
  const qualifiesFreeShipping = selectedTotal >= threshold;

  return (
    <section className="section section--dark section--page">
      <div className="container">
        <div className="amz-layout">
          {/* Columna izquierda: Productos en el carrito + Guardados para más tarde */}
          <div className="amz-main">
            <div className="amz-card">
              <header className="amz-card__head">
                <div>
                  <p className="eyebrow">Tu selección</p>
                  <h1 className="amz-title">Carrito de compras</h1>
                  {lines.length > 0 && (
                    <button
                      type="button"
                      className="amz-link"
                      onClick={() => toggleAll(!allSelected)}
                    >
                      {allSelected ? 'Deseleccionar todos los artículos' : 'Seleccionar todos los artículos'}
                    </button>
                  )}
                </div>
                <span className="amz-price-col">Precio</span>
              </header>

              {lines.length === 0 ? (
                <div className="amz-empty">
                  <ShoppingCart size={36} strokeWidth={1.5} />
                  <h2>Tu carrito de NEXORA está vacío</h2>
                  <p>Explora compresores A/C, condensadores, gases R134a e iluminación LED para tu vehículo.</p>
                  <Link to="/catalogo" className="btn btn--primary btn--pill">
                    Explorar catálogo
                  </Link>
                </div>
              ) : (
                <div className="amz-items">
                  {lines.map(({ product, quantity, selected }) => {
                    const low = product.in_stock && product.stock_quantity <= 5;
                    const atMax = quantity >= product.stock_quantity;
                    return (
                      <article
                        key={product.product_id}
                        className={`amz-item ${selected ? '' : 'is-unselected'}`}
                      >
                        <label className="amz-check" aria-label={`Seleccionar ${product.name}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(product.product_id)}
                          />
                        </label>

                        <div className="amz-item__thumb">
                          <img
                            src={getProductImage(product)}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>

                        <div className="amz-item__body">
                          <div className="amz-item__top">
                            <div>
                              <h3>{product.name}</h3>
                              <p className="amz-item__meta">
                                {product.sku}
                                {product.oem_code ? ` · OEM ${product.oem_code}` : ''}
                                {product.brand ? ` · ${product.brand}` : ''}
                              </p>
                              {product.vehicle_compatibility && (
                                <p className="amz-item__compat">{product.vehicle_compatibility}</p>
                              )}
                              <p className={`amz-stock ${low ? 'is-low' : 'is-ok'}`}>
                                {low
                                  ? `Solo quedan ${product.stock_quantity} en stock — ¡haz tu pedido pronto!`
                                  : `En stock (${product.stock_quantity} disponibles)`}
                              </p>
                            </div>
                            <div className="amz-item__price">
                              <strong>{money(product.price * quantity, product.currency)}</strong>
                              {settings.show_bs_prices && settings.bcv_rate > 0 && (
                                <small className="price-bs">{moneyBs(product.price * quantity, settings.bcv_rate)}</small>
                              )}
                              {quantity > 1 && (
                                <small>{money(product.price, product.currency)} c/u</small>
                              )}
                            </div>
                          </div>

                          <div className="amz-item__actions">
                            {/* Selector de cantidad estilo Amazon */}
                            <div className="amz-qty" role="group" aria-label={`Cantidad de ${product.name}`}>
                              <button
                                type="button"
                                onClick={() => setQty(product.product_id, quantity - 1)}
                                aria-label={quantity === 1 ? 'Eliminar producto' : 'Disminuir cantidad'}
                              >
                                {quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                              </button>
                              <span>{quantity}</span>
                              <button
                                type="button"
                                disabled={atMax}
                                onClick={() => setQty(product.product_id, quantity + 1)}
                                aria-label="Aumentar cantidad"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <span className="amz-sep" aria-hidden="true" />

                            <button
                              type="button"
                              className="amz-link"
                              onClick={() => remove(product.product_id)}
                            >
                              Eliminar
                            </button>

                            <span className="amz-sep" aria-hidden="true" />

                            <button
                              type="button"
                              className="amz-link"
                              onClick={() => saveForLater(product.product_id)}
                            >
                              <Bookmark size={12} /> Guardar para más tarde
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {lines.length > 0 && (
                <footer className="amz-card__foot">
                  Subtotal ({selectedCount} {selectedCount === 1 ? 'producto' : 'productos'}):{' '}
                  <strong>{money(selectedTotal)}</strong>
                </footer>
              )}
            </div>

            {/* Guardado para más tarde (estilo Amazon) */}
            {saved.length > 0 && (
              <section className="amz-card amz-saved">
                <h2>Guardado para más tarde ({saved.length})</h2>
                <div className="amz-saved__grid">
                  {saved.map((p) => (
                    <article key={p.product_id} className="amz-saved__item">
                      <div className="amz-saved__thumb">
                        <img src={getProductImage(p)} alt={p.name} loading="lazy" />
                      </div>
                      <div className="amz-saved__info">
                        <h3>{p.name}</h3>
                        <p className="price">{money(p.price, p.currency)}</p>
                        <p className="amz-stock is-ok">
                          {p.in_stock ? `Disponible (${p.stock_quantity})` : 'Sin stock'}
                        </p>
                      </div>
                      <div className="amz-saved__actions">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          disabled={!p.in_stock}
                          onClick={() => moveToCart(p.product_id)}
                        >
                          Mover al carrito
                        </button>
                        <button
                          type="button"
                          className="amz-link"
                          onClick={() => removeSaved(p.product_id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Columna derecha sticky: Resumen estilo Amazon */}
          <aside className="amz-summary">
            <div className="amz-card amz-summary__box">
              {settings.free_shipping_enabled && (
                <div className={`amz-shipping ${qualifiesFreeShipping ? 'is-free' : ''}`}>
                  <div className="amz-shipping__text">
                    {qualifiesFreeShipping ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>
                          <strong>Tu pedido califica para envío GRATIS.</strong> Selecciona esta opción al confirmar.
                        </span>
                      </>
                    ) : (
                      <>
                        <Truck size={16} />
                        <span>
                          Agrega <strong>{money(remainingForFreeShipping, settings.currency)}</strong> más para obtener{' '}
                          <strong>envío GRATIS</strong>.
                        </span>
                      </>
                    )}
                  </div>
                  <div className="amz-progress" aria-hidden="true">
                    <div className="amz-progress__fill" style={{ width: `${freeShippingProgress}%` }} />
                  </div>
                </div>
              )}

              <p className="amz-summary__total">
                Subtotal ({selectedCount} {selectedCount === 1 ? 'producto' : 'productos'}):{' '}
                <strong>{money(selectedTotal, settings.currency)}</strong>
                {settings.show_bs_prices && settings.bcv_rate > 0 && (
                  <span className="price-bs">{moneyBs(selectedTotal, settings.bcv_rate)}</span>
                )}
              </p>

              <button
                type="button"
                className="btn btn--primary btn--block btn--pill"
                disabled={selectedCount === 0}
                onClick={() => navigate('/checkout')}
              >
                Proceder al pago ({selectedCount})
              </button>

              <p className="amz-summary__trust">
                <ShieldCheck size={14} /> Compra protegida e idempotente · Stock validado en tiempo real
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
