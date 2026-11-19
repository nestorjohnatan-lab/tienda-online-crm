import { useQuery, money, dateTime } from '../../shared/api/useQuery';
import { PageState, Stat, StatusPill } from '../../shared/ui/molecules/Common';

interface Summary {
  total_sales_amount: number;
  orders_count: number;
  pending_orders_count: number;
  low_stock_products_count: number;
  active_banners_count: number;
  recent_orders: { order_id: number; order_number: string; customer_name: string; order_status: string; total_amount: number; currency: string; created_at: string }[];
}

export function DashboardPage() {
  const q = useQuery<Summary>('/dashboard/summary');
  return (
    <>
      <h1>Dashboard</h1>
      <PageState loading={q.loading} error={q.error}>
        {q.data && (
          <>
            <div className="grid grid--stats">
              <Stat label="Ventas acumuladas" value={money(q.data.total_sales_amount)} />
              <Stat label="Pedidos" value={q.data.orders_count} />
              <Stat label="Pendientes" value={q.data.pending_orders_count} tone="warn" />
              <Stat label="Stock bajo" value={q.data.low_stock_products_count} tone={q.data.low_stock_products_count ? 'bad' : 'ok'} />
              <Stat label="Banners activos" value={q.data.active_banners_count} tone="ok" />
            </div>
            <h2>Pedidos recientes</h2>
            <div className="card table-wrap">
              <table>
                <thead><tr><th>Orden</th><th>Cliente</th><th>Estado</th><th className="num">Total</th><th>Fecha</th></tr></thead>
                <tbody>
                  {q.data.recent_orders.map((o) => (
                    <tr key={o.order_id}>
                      <td className="mono">{o.order_number}</td><td>{o.customer_name}</td>
                      <td><StatusPill value={o.order_status} /></td>
                      <td className="num">{money(o.total_amount, o.currency)}</td><td>{dateTime(o.created_at)}</td>
                    </tr>
                  ))}
                  {q.data.recent_orders.length === 0 && <tr><td colSpan={5} className="muted">Aún no hay pedidos.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PageState>
    </>
  );
}
