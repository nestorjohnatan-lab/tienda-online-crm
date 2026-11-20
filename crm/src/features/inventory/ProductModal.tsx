import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api, resolveMediaUrl, uploadImageDataUrl } from '../../shared/api/http';
import { money, useQuery } from '../../shared/api/useQuery';
import { PricingModal, type PricingValues } from './PricingModal';

export interface CrmCategory {
  category_id: number;
  name: string;
  product_line: 'refrigeracion_vehicular' | 'variados_vehiculos';
}

export interface CrmProduct {
  product_id: number;
  category_id: number;
  sku: string;
  name: string;
  slug: string;
  product_line: 'refrigeracion_vehicular' | 'variados_vehiculos';
  model_name: string | null;
  description: string | null;
  cost_price: number;
  profit_margin_pct: number;
  tax_rate_pct: number;
  price: number;
  currency: string;
  stock_quantity: number;
  min_stock_threshold: number;
  is_low_stock: boolean;
  is_active: boolean;
  gallery_urls?: string[];
  thumbnail_url?: string | null;
}

interface ProductModalProps {
  product: CrmProduct | null;
  onSaved(message: string): void;
  onClose(): void;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export function ProductModal({ product, onSaved, onClose }: ProductModalProps) {
  const cats = useQuery<{ items: CrmCategory[] }>('/categories');
  const isEdit = Boolean(product);

  const [sku, setSku] = useState(product?.sku ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [modelName, setModelName] = useState(product?.model_name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [productLine, setProductLine] = useState<'refrigeracion_vehicular' | 'variados_vehiculos'>(
    product?.product_line ?? 'refrigeracion_vehicular',
  );
  const [categoryId, setCategoryId] = useState<string>(
    product ? String(product.category_id) : '',
  );
  const [stockQty, setStockQty] = useState<string>(String(product?.stock_quantity ?? 0));
  const [minStock, setMinStock] = useState<string>(String(product?.min_stock_threshold ?? 5));

  const [pricing, setPricing] = useState<PricingValues>({
    cost_price: product?.cost_price ?? 0,
    profit_margin_pct: product?.profit_margin_pct ?? 30,
    tax_rate_pct: product?.tax_rate_pct ?? 16,
    sale_price: product?.price ?? 0,
  });

  const [showPricing, setShowPricing] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    product?.gallery_urls && product.gallery_urls.length > 0
      ? product.gallery_urls
      : product?.thumbnail_url
        ? [product.thumbnail_url]
        : [],
  );
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, 6)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Error leyendo imagen'));
          reader.readAsDataURL(file);
        });
        const res = await uploadImageDataUrl(dataUrl);
        uploaded.push(res.url);
      }
      setGalleryUrls((prev) => [...prev, ...uploaded].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo fotos');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addExternalUrl = () => {
    const clean = urlInput.trim();
    if (!clean) return;
    setGalleryUrls((prev) => [...prev, clean].slice(0, 8));
    setUrlInput('');
  };

  const categories = cats.data?.items ?? [];
  const selectedCategoryId = Number(categoryId) || categories[0]?.category_id || 1;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const cleanSku = sku.trim();
    const cleanName = name.trim();
    const generatedSlug = product?.slug ?? `${slugify(cleanName)}-${slugify(cleanSku)}`;

    const basePayload = {
      category_id: selectedCategoryId,
      sku: cleanSku,
      name: cleanName,
      slug: generatedSlug || `prod-${Date.now()}`,
      product_line: productLine,
      model_name: modelName.trim() || null,
      description: description.trim() || null,
      cost_price: pricing.cost_price,
      profit_margin_pct: pricing.profit_margin_pct,
      tax_rate_pct: pricing.tax_rate_pct,
      sale_price: pricing.sale_price,
      currency: 'USD',
      min_stock_threshold: Math.max(0, Number(minStock) || 0),
      thumbnail_url: galleryUrls[0] ?? null,
      gallery_urls: galleryUrls,
      is_active: product?.is_active ?? true,
    };

    try {
      if (isEdit && product) {
        await api(`/products/${product.product_id}`, { method: 'PUT', body: basePayload });
        onSaved(`Producto ${cleanSku} actualizado`);
      } else {
        await api('/products', {
          method: 'POST',
          body: { ...basePayload, stock_quantity: Math.max(0, Number(stockQty) || 0) },
        });
        onSaved(`Producto ${cleanSku} agregado al inventario`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Editar producto' : 'Agregar al inventario'}>
        <button type="button" className="modal__backdrop" aria-label="Cerrar" onClick={onClose} />
        <form className="modal__card form" onSubmit={submit}>
          <header className="modal__head">
            <h2>{isEdit ? `Editar ${product?.sku}` : 'Agregar al inventario'}</h2>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
          </header>

          <div className="grid grid--2">
            <label>
              Código de producto (SKU)
              <input
                required
                minLength={2}
                maxLength={64}
                placeholder="AC-CMP-002"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </label>
            <label>
              Modelo
              <input
                maxLength={120}
                placeholder="Corolla 1.8 / 6SEU14C"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </label>
          </div>

          <label>
            Nombre del producto
            <input
              required
              minLength={2}
              maxLength={180}
              placeholder="Compresor A/C 12V..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            Descripción
            <textarea
              rows={3}
              maxLength={5000}
              placeholder="Detalles técnicos, compatibilidad o notas del producto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="grid grid--2">
            <label>
              Línea
              <select
                value={productLine}
                onChange={(e) => setProductLine(e.target.value as 'refrigeracion_vehicular' | 'variados_vehiculos')}
              >
                <option value="refrigeracion_vehicular">Refrigeración Vehicular</option>
                <option value="variados_vehiculos">Variados Vehículos</option>
              </select>
            </label>
            <label>
              Categoría
              <select
                value={selectedCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid--2">
            {!isEdit && (
              <label>
                Stock inicial
                <input
                  type="number"
                  min="0"
                  required
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
              </label>
            )}
            <label>
              Stock mínimo (alerta)
              <input
                type="number"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </label>
          </div>

          {/* Galería multi-foto del producto */}
          <div className="form" style={{ gap: '0.45rem' }}>
            <label>
              Fotos del producto (máx. 8 · la primera será la portada)
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFileUpload} disabled={uploading} />
            </label>
            <div className="row">
              <input
                type="url"
                placeholder="O pega URL externa de imagen..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn--sm" onClick={addExternalUrl}>Agregar URL</button>
            </div>
            {uploading && <small className="muted">Subiendo imágenes…</small>}
            {galleryUrls.length > 0 && (
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                {galleryUrls.map((u, idx) => (
                  <div key={`${u}-${idx}`} style={{ position: 'relative', width: 64, height: 52, border: '1px solid #e3e6ec', borderRadius: 6, overflow: 'hidden' }}>
                    <img src={resolveMediaUrl(u)} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      aria-label="Quitar foto"
                      onClick={() => setGalleryUrls((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(20,23,28,0.8)', color: '#fff', border: 0, borderRadius: 4, fontSize: 10, padding: '1px 4px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón que abre la Modal de Precios y Costos */}
          <div className="pricing-bar">
            <div>
              <strong>Precios y Costos</strong>
              <small className="muted">
                Costo: {money(pricing.cost_price)} · Utilidad: {pricing.profit_margin_pct}% · Impuesto: {pricing.tax_rate_pct}% · PVP: <b>{money(pricing.sale_price)}</b>
              </small>
            </div>
            <button type="button" className="btn btn--dark" onClick={() => setShowPricing(true)}>
              Precios y Costos
            </button>
          </div>

          {error && <p className="alert" role="alert">{error}</p>}

          <footer className="modal__foot">
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar producto'}
            </button>
          </footer>
        </form>
      </div>

      {showPricing && (
        <PricingModal
          initial={pricing}
          onApply={(next) => {
            setPricing(next);
            setShowPricing(false);
          }}
          onClose={() => setShowPricing(false)}
        />
      )}
    </>
  );
}
