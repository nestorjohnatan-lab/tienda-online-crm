import { useState, type FormEvent } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { storeApi } from '../../shared/api/client';
import type { OrderMessage } from '../../shared/api/contracts';

export function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [messages, setMessages] = useState<readonly OrderMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');

  const handleLoad = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await storeApi.orderMessages(orderNumber, contact);
      setCustomerName(data.customer_name);
      setMessages(data.messages);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos validar ese pedido');
      setLoaded(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const created = await storeApi.sendOrderMessage(orderNumber, {
        contact,
        message_text: text,
      });
      setMessages((prev) => [...prev, created]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section section--dark section--page">
      <div className="container" style={{ maxWidth: '46rem' }}>
        <p className="eyebrow">Mensajería directa comprador ↔ tienda</p>
        <h1 className="page-title"><MessageSquare size={24} style={{ verticalAlign: 'middle' }} /> Mis Compras y Mensajes</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>
          Ingresa el número de tu pedido y el correo o teléfono con el que compraste para chatear directamente con la tienda.
        </p>

        <form className="seller-card form" onSubmit={handleLoad}>
          <div className="pdp-form__row">
            <input
              required
              placeholder="N° de Pedido (ej. ORD-2026-000001)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
            <input
              required
              placeholder="Correo o teléfono usado en el pedido"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <button className="btn btn--primary" disabled={busy}>
              {busy ? 'Buscando…' : 'Abrir chat'}
            </button>
          </div>
          {error && <p className="form__error">{error}</p>}
        </form>

        {loaded && (
          <div className="seller-card" style={{ marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Chat del pedido {orderNumber} · {customerName}</h3>
            <div className="chat-box">
              {messages.length === 0 ? (
                <p className="muted">No hay mensajes aún. Escribe a la tienda para coordinar tu envío o consulta.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.message_id} className={`chat-msg chat-msg--${m.sender_role}`}>
                    <small>{m.sender_role === 'buyer' ? 'Tú' : `Tienda (${m.sender_name})`}</small>
                    <p>{m.message_text}</p>
                  </div>
                ))
              )}
            </div>
            <form className="pdp-form__row" onSubmit={handleSend} style={{ marginTop: '0.75rem' }}>
              <input
                required
                placeholder="Escribe un mensaje a la tienda..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn--primary" disabled={busy}>
                <Send size={14} /> Enviar
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
