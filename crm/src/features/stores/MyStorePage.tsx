import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../shared/api/http';
import type { StoreProfile } from '../../shared/api/contracts';
import { useQuery } from '../../shared/api/useQuery';
import { PageState } from '../../shared/ui/molecules/Common';

interface MyStoreData {
  is_platform_admin: boolean;
  store: StoreProfile | null;
  stores: StoreProfile[];
}

export function MyStorePage() {
  const q = useQuery<MyStoreData>('/stores/me');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = q.data?.store;
    if (s) {
      setName(s.name);
      setDescription(s.description ?? '');
      setCity(s.city ?? '');
      setPhone(s.phone ?? '');
      setEmail(s.email ?? '');
    }
  }, [q.data]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api('/stores/me', {
        method: 'PUT',
        body: {
          name,
          description: description || null,
          city: city || null,
          phone: phone || null,
          email: email || null,
        },
      });
      setMsg('Perfil de tienda actualizado');
      q.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setBusy(false);
    }
  };

  const store = q.data?.store;

  return (
    <>
      <h1>Mi Tienda en NEXORA</h1>
      <PageState loading={q.loading} error={q.error}>
        {store && (
          <div className="grid grid--stats" style={{ marginBottom: '1rem' }}>
            <div className="card stat"><small>Reputación</small><strong>{store.rating_average.toFixed(1)} ★ ({store.rating_count})</strong></div>
            <div className="card stat"><small>Productos activos</small><strong>{store.products_count}</strong></div>
            <div className="card stat"><small>Tasa de respuesta</small><strong>{store.response_rate_pct}%</strong></div>
            <div className="card stat"><small>Slug público</small><strong className="mono">{store.slug}</strong></div>
          </div>
        )}

        <form className="card form" onSubmit={onSave}>
          <h2 style={{ marginTop: 0 }}>Datos públicos de tu tienda</h2>
          <div className="grid grid--2">
            <label>Nombre de la tienda<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Ciudad<input value={city} onChange={(e) => setCity(e.target.value)} /></label>
            <label>Teléfono / WhatsApp<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <label>Correo público<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          </div>
          <label>
            Descripción
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          {msg && <p className="notice">{msg}</p>}
          <button className="btn btn--primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar perfil de tienda'}
          </button>
        </form>
      </PageState>
    </>
  );
}
