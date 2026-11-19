import { useState, type FormEvent } from 'react';
import { api } from '../../shared/api/http';
import type { CrmBanner } from '../../shared/api/contracts';
import { useQuery } from '../../shared/api/useQuery';
import { PageState } from '../../shared/ui/molecules/Common';

const STORE_URL = import.meta.env.VITE_STORE_PUBLIC_URL ?? 'http://localhost:5173';

export function BannersPage() {
  const q = useQuery<{ items: CrmBanner[] }>('/banners');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try { await fn(); setMsg(ok); q.reload(); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Error'); }
    finally { setBusy(false); }
  };

  const items = q.data?.items ?? [];

  const toggle = (b: CrmBanner) =>
    run(() => api(`/banners/${b.banner_id}/status`, { method: 'PATCH', body: { is_active: !b.is_active } }), 'Estado actualizado');

  const move = (i: number, d: -1 | 1) => {
    const ids = items.map((b) => b.banner_id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    return run(() => api('/banners/reorder', { method: 'PATCH', body: { ordered_banner_ids: ids } }), 'Orden actualizado');
  };

  const archive = (b: CrmBanner) => {
    if (!confirm(`¿Archivar el banner "${b.title}"?`)) return;
    return run(() => api(`/banners/${b.banner_id}/archive`, { method: 'PATCH' }), 'Banner archivado');
  };

  const create = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const text = (k: string) => String(f.get(k) ?? '').trim();
    return run(async () => {
      await api('/banners', {
        method: 'POST',
        body: {
          badge_text: text('badge_text') || null,
          title: text('title'),
          highlight_text: text('highlight_text') || null,
          subtitle: text('subtitle') || null,
          image_url: text('image_url') || '/media/banners/default.webp',
          image_alt: text('title'),
          cta_label: text('cta_label'),
          cta_url: text('cta_url'),
          display_order: items.length + 1,
          is_active: true,
        },
      });
      form.reset();
    }, 'Banner publicado en la tienda');
  };

  return (
    <>
      <div className="head">
        <h1>Carrusel de banners</h1>
        <a className="btn btn--dark" href={STORE_URL} target="_blank" rel="noreferrer">Ver tienda ↗</a>
      </div>
      <p className="muted">Los banners activos aparecen en la portada de la tienda según este orden.</p>
      {msg && <p className="notice" role="status">{msg}</p>}

      <div className="split">
        <div>
          <PageState loading={q.loading} error={q.error}>
            <div className="stack">
              {items.map((b, i) => (
                <div key={b.banner_id} className={`card row ${b.is_active ? '' : 'is-off'}`}>
                  <span className="mono rank">#{i + 1}</span>
                  <div className="grow">
                    <strong>{b.title} <span className="accent">{b.highlight_text}</span></strong>
                    <small className="muted">{b.subtitle}</small>
                  </div>
                  <div className="actions">
                    <button className="btn btn--sm" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Subir">↑</button>
                    <button className="btn btn--sm" disabled={busy || i === items.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">↓</button>
                    <button className={`btn btn--sm ${b.is_active ? 'btn--ok' : ''}`} disabled={busy} onClick={() => toggle(b)}>{b.is_active ? 'Activo' : 'Inactivo'}</button>
                    <button className="btn btn--sm btn--danger" disabled={busy} onClick={() => archive(b)}>Archivar</button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="muted">No hay banners. Crea el primero.</p>}
            </div>
          </PageState>
        </div>

        <form className="card form" onSubmit={create}>
          <h2>Nuevo slide</h2>
          <label>Etiqueta superior<input name="badge_text" maxLength={80} placeholder="PROMO VERANO A/C" /></label>
          <label>Título (blanco)<input name="title" required minLength={2} maxLength={140} placeholder="Renueva el A/C de" /></label>
          <label>Texto destacado (rojo)<input name="highlight_text" maxLength={80} placeholder="Tu flota" /></label>
          <label>Subtítulo<input name="subtitle" maxLength={280} /></label>
          <label>URL de imagen<input name="image_url" maxLength={500} placeholder="/media/banners/hero.webp" /></label>
          <label>Texto del botón<input name="cta_label" required defaultValue="Ver ofertas" maxLength={60} /></label>
          <label>Enlace del botón<input name="cta_url" required defaultValue="/catalogo" maxLength={300} /></label>
          <button className="btn btn--primary" disabled={busy}>Publicar banner</button>
        </form>
      </div>
    </>
  );
}
