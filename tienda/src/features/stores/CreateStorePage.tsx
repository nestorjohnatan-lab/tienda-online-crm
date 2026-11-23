import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Store } from 'lucide-react';
import { storeApi } from '../../shared/api/client';
import type { MarketplaceStore } from '../../shared/api/contracts';

const ERP_URL = import.meta.env.VITE_ERP_URL ?? '/nexora/sva_online/';

export function CreateStorePage() {
  const [storeName, setStoreName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStore, setCreatedStore] = useState<MarketplaceStore | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await storeApi.registerStore({
        store_name: storeName,
        city,
        phone,
        description: description || undefined,
        owner_name: ownerName,
        owner_email: ownerEmail,
        password,
      });
      setCreatedStore(res.store);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la tienda');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section section--dark section--page">
      <div className="container" style={{ maxWidth: '46rem' }}>
        <p className="eyebrow">NEXORA SaaS Marketplace</p>
        <h1 className="page-title"><Store size={26} style={{ verticalAlign: 'middle' }} /> Crea tu tienda en NEXORA</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          Publica tu catálogo, sube fotos de tus productos, controla tu inventario y responde preguntas y reseñas de clientes desde tu propio panel CRM.
        </p>

        {createdStore ? (
          <div className="seller-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
              <CheckCircle2 size={22} color="#16a34a" /> ¡Tu tienda "{createdStore.name}" ya está activa!
            </h2>
            <p className="muted">
              Ya puedes ingresar al Panel Administrativo ERP con tu usuario para gestionar ventas, productos e inventario.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
              <a href={ERP_URL} target="_blank" rel="noreferrer" className="btn btn--primary btn--pill">
                Abrir Panel ERP &amp; Inventario
              </a>
              <Link to={`/tienda/${createdStore.slug}`} className="btn btn--outline btn--pill">
                Ver perfil público de mi tienda
              </Link>
            </div>
          </div>
        ) : (
          <form className="seller-card form" onSubmit={onSubmit}>
            <div className="pdp-form__grid">
              <label>
                Nombre de tu tienda *
                <input required minLength={2} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ej. AutoPartes Central" />
              </label>
              <label>
                Ciudad *
                <input required minLength={2} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. Valencia" />
              </label>
              <label>
                Teléfono / WhatsApp *
                <input required minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+584121234567" />
              </label>
              <label>
                Tu nombre completo *
                <input required minLength={2} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nombre del responsable" />
              </label>
              <label>
                Correo de acceso al CRM *
                <input type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="ventas@mitienda.com" />
              </label>
              <label>
                Contraseña (mín. 6 caracteres) *
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            </div>
            <label>
              Descripción de tu tienda
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Especialistas en refrigeración vehicular, repuestos y accesorios..." />
            </label>
            {error && <p className="form__error">{error}</p>}
            <button className="btn btn--primary btn--pill" disabled={busy}>
              {busy ? 'Creando tienda…' : 'Crear mi tienda gratis'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
