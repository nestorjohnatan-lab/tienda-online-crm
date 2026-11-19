import { useState } from 'react';
import { useQuery, dateTime } from '../../shared/api/useQuery';
import { PageState } from '../../shared/ui/molecules/Common';

interface Customer {
  customer_id: number; full_name: string; email: string | null; phone: string;
  city: string | null; document_id: string | null; created_at: string;
}

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const q = useQuery<{ items: Customer[] }>(`/customers?page_size=100${search ? `&q=${encodeURIComponent(search)}` : ''}`);
  return (
    <>
      <h1>Clientes</h1>
      <div className="toolbar">
        <input type="search" placeholder="Nombre, correo, teléfono o documento" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar clientes" />
      </div>
      <PageState loading={q.loading} error={q.error}>
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Contacto</th><th>Ciudad</th><th>Documento</th><th>Registro</th></tr></thead>
            <tbody>
              {q.data?.items.map((c) => (
                <tr key={c.customer_id}>
                  <td><strong>{c.full_name}</strong></td>
                  <td>{c.email ?? '—'}<small className="muted">{c.phone}</small></td>
                  <td>{c.city ?? '—'}</td><td className="mono">{c.document_id ?? '—'}</td><td>{dateTime(c.created_at)}</td>
                </tr>
              ))}
              {q.data?.items.length === 0 && <tr><td colSpan={5} className="muted">Sin clientes.</td></tr>}
            </tbody>
          </table>
        </div>
      </PageState>
    </>
  );
}
