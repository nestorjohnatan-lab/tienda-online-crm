import { useState, type FormEvent } from 'react';
import { api } from '../../shared/api/http';
import type { CrmSaleSummary, OrderMessage, OrderStatus } from '../../shared/api/contracts';
import { useQuery, money, dateTime } from '../../shared/api/useQuery';
import { PageState, StatusPill } from '../../shared/ui/molecules/Common';

const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ['confirmado', 'pagado', 'cancelado'],
  confirmado: ['pagado', 'despachado', 'cancelado'],
  pagado: ['despachado', 'entregado', 'cancelado'],
  despachado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

interface SaleDetail extends CrmSaleSummary {
  payment_method: string;
  notes: string | null;
  payment_receipt_data: string | null;
}

export function SalesPage() {
  const [status, setStatus] = useState('');
  const q = useQuery<{ items: CrmSaleSummary[] }>(`/sales?page_size=100${status ? `&order_status=${status}` : ''}`);
  const [msg, setMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [chatOrder, setChatOrder] = useState<CrmSaleSummary | null>(null);
  const [chatMsgs, setChatMsgs] = useState<OrderMessage[]>([]);
  const [chatText, setChatText] = useState('');

  const change = async (s: CrmSaleSummary, next: OrderStatus) => {
    if (next === 'cancelado' && !confirm(`Cancelar ${s.order_number}? El stock se devolverá al inventario.`)) return;
    setMsg(null);
    try {
      await api(`/sales/${s.order_id}/status`, { method: 'PATCH', body: { order_status: next } });
      setMsg(`${s.order_number} → ${next}`);
      q.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    }
  };

  const openReceipt = async (orderId: number) => {
    try {
      const d = await api<SaleDetail>(`/sales/${orderId}`);
      setDetail(d);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo cargar el detalle');
    }
  };

  const openChat = async (s: CrmSaleSummary) => {
    setChatOrder(s);
    setChatText('');
    try {
      const list = await api<OrderMessage[]>(`/sales/${s.order_id}/messages`);
      setChatMsgs(list);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo abrir el chat');
    }
  };

  const sendChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatOrder || !chatText.trim()) return;
    try {
      const created = await api<OrderMessage>(`/sales/${chatOrder.order_id}/messages`, {
        method: 'POST',
        body: { message_text: chatText.trim() },
      });
      setChatMsgs((prev) => [...prev, created]);
      setChatText('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo enviar');
    }
  };

  return (
    <>
      <h1>Ventas y pedidos</h1>
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {(Object.keys(FLOW) as OrderStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {msg && <p className="notice" role="status">{msg}</p>}
      <PageState loading={q.loading} error={q.error}>
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Orden</th><th>Cliente</th><th>Canal</th><th>Estado</th><th className="num">Total</th><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody>
              {q.data?.items.map((s) => (
                <tr key={s.order_id}>
                  <td className="mono">{s.order_number}</td><td>{s.customer_name}</td><td className="mono">{s.sales_channel}</td>
                  <td><StatusPill value={s.order_status} /></td>
                  <td className="num">{money(s.total_amount, s.currency)}</td><td>{dateTime(s.created_at)}</td>
                  <td className="actions">
                    <button className="btn btn--sm" onClick={() => void openReceipt(s.order_id)}>Comprobante</button>
                    <button className="btn btn--sm" onClick={() => void openChat(s)}>Chat</button>
                    {FLOW[s.order_status].map((n) => (
                      <button key={n} className={`btn btn--sm ${n === 'cancelado' ? 'btn--danger' : ''}`} onClick={() => change(s, n)}>{n}</button>
                    ))}
                  </td>
                </tr>
              ))}
              {q.data?.items.length === 0 && <tr><td colSpan={7} className="muted">Sin ventas registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </PageState>

      {detail && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Comprobante de pago">
          <button type="button" className="modal__backdrop" onClick={() => setDetail(null)} aria-label="Cerrar" />
          <div className="modal__card modal__card--sm form">
            <header className="modal__head">
              <h2>{detail.order_number}</h2>
              <button type="button" className="modal__close" onClick={() => setDetail(null)}>✕</button>
            </header>
            <p><strong>Cliente:</strong> {detail.customer_name} · <strong>Método:</strong> {detail.payment_method}</p>
            {detail.notes && <p className="muted"><strong>Nota:</strong> {detail.notes}</p>}
            {detail.payment_receipt_data ? (
              <img
                src={detail.payment_receipt_data}
                alt={`Comprobante de ${detail.order_number}`}
                style={{ width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }}
              />
            ) : (
              <p className="muted">Esta orden no tiene captura de pago adjunta.</p>
            )}
            <footer className="modal__foot">
              <button type="button" className="btn btn--primary" onClick={() => setDetail(null)}>Cerrar</button>
            </footer>
          </div>
        </div>
      )}

      {chatOrder && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Chat del pedido">
          <button type="button" className="modal__backdrop" onClick={() => setChatOrder(null)} aria-label="Cerrar" />
          <div className="modal__card modal__card--sm form">
            <header className="modal__head">
              <h2>Chat · {chatOrder.order_number}</h2>
              <button type="button" className="modal__close" onClick={() => setChatOrder(null)}>✕</button>
            </header>
            <div className="stack" style={{ maxHeight: '18rem', overflowY: 'auto' }}>
              {chatMsgs.length === 0 ? (
                <p className="muted">Sin mensajes todavía.</p>
              ) : (
                chatMsgs.map((m) => (
                  <div key={m.message_id} className="card" style={{ padding: '0.55rem 0.75rem' }}>
                    <small className="muted">{m.sender_role === 'buyer' ? `Comprador (${m.sender_name})` : `Tú (${m.sender_name})`}</small>
                    <p style={{ margin: '2px 0 0' }}>{m.message_text}</p>
                  </div>
                ))
              )}
            </div>
            <form className="row" onSubmit={(e) => void sendChat(e)}>
              <input
                required
                placeholder="Responder al comprador..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn--primary btn--sm">Enviar</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
