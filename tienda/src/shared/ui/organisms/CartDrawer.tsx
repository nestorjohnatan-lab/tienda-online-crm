import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useStoreSettings } from '../../api/client';
import { useCart } from '../../cart/CartContext';
import { getProductImage, money, moneyBs } from '../molecules/ProductCard';

export function CartDrawer() {
  const { lines, selectedCount, selectedTotal, open, setOpen, setQty, remove } = useCart();
  const { data: settings } = useStoreSettings();
  const navigate = useNavigate();

  if (!open) return null;

  const remaining = Math.max(0, settings.free_shipping_threshold - selectedTotal);
  const qualifies = selectedTotal >= settings.free_shipping_threshold;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Carrito de compras">
      <button className="drawer__backdrop" aria-label="Cerrar carrito" onClick={() => setOpen(false)} />
      <aside className="drawer__panel">
        <header>
          <h2>
            <ShoppingBag size={18} />
            Carrito ({selectedCount})
          </h2>
          <button onClick={() => setOpen(false)} aria-label="Cerrar" className="drawer__close">
            <X size={18} />
          </button>
        </header>

        {lines.length > 0 && settings.free_shipping_enabled && (
          <div className={`drawer__shipping ${qualifies ? 'is-free' : ''}`}>
            {qualifies ? (
              <>
                <CheckCircle2 size={15} />
                <span>¡Envío GRATIS desbloqueado!</span>
              </>
            ) : (
              <>
                <Truck size={15} />
                <span>Te faltan <strong>{money(remaining, settings.currency)}</strong> para envío GRATIS</span>
              </>
            )}
          </div>
        )}

        <div className="drawer__body">
          {lines.length === 0 && (
            <p className="empty">Tu carrito está vacío. Agrega repuestos desde el catálogo.</p>
          )}
          {lines.map(({ product, quantity }) => (
            <div key={product.product_id} className="line">
              <img
                src={getProductImage(product)}
                alt={product.name}
                className="line__thumb"
              />
              <div className="line__info">
                <strong>{product.name}</strong>
                <small>
                  {money(product.price * quantity, product.currency)}
                  {settings.show_bs_prices && settings.bcv_rate > 0 && (
                    <> · {moneyBs(product.price * quantity, settings.bcv_rate)}</>
                  )}
                </small>
                <div className="line__controls">
                  <div className="amz-qty amz-qty--sm">
                    <button
                      type="button"
                      onClick={() => setQty(product.product_id, quantity - 1)}
                      aria-label={quantity === 1 ? 'Eliminar' : 'Disminuir'}
                    >
                      {quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      disabled={quantity >= product.stock_quantity}
                      onClick={() => setQty(product.product_id, quantity + 1)}
                      aria-label="Aumentar"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(product.product_id)}
                    className="amz-link"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer>
          <p className="drawer__total">
            <span>Subtotal</span>
            <span>
              <strong>{money(selectedTotal, settings.currency)}</strong>
              {settings.show_bs_prices && settings.bcv_rate > 0 && (
                <small className="price-bs">{moneyBs(selectedTotal, settings.bcv_rate)}</small>
              )}
            </span>
          </p>
          <div className="drawer__actions">
            <button
              className="btn btn--primary btn--block"
              disabled={selectedCount === 0}
              onClick={() => {
                setOpen(false);
                navigate('/checkout');
              }}
            >
              Proceder al pago ({selectedCount})
            </button>
            <button
              className="btn btn--outline btn--block"
              onClick={() => {
                setOpen(false);
                navigate('/carrito');
              }}
            >
              Ir al carrito completo
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
