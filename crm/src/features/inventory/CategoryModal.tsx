import { useState, type FormEvent } from 'react';
import { api } from '../../shared/api/http';

export interface CrmCategoryDetail {
  category_id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  product_line: 'refrigeracion_vehicular' | 'variados_vehiculos';
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  active_products_count: number;
}

interface CategoryModalProps {
  category: CrmCategoryDetail | null;
  defaultOrder: number;
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
    .slice(0, 120);
}

export function CategoryModal({ category, defaultOrder, onSaved, onClose }: CategoryModalProps) {
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [subtitle, setSubtitle] = useState(category?.subtitle ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [productLine, setProductLine] = useState<'refrigeracion_vehicular' | 'variados_vehiculos'>(
    category?.product_line ?? 'refrigeracion_vehicular',
  );
  const [displayOrder, setDisplayOrder] = useState(String(category?.display_order ?? defaultOrder));
  const [isFeatured, setIsFeatured] = useState(category?.is_featured ?? true);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      parent_id: category?.parent_id ?? null,
      name: name.trim(),
      slug: (slug.trim() || slugify(name)).toLowerCase(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      image_url: category?.image_url ?? null,
      product_line: productLine,
      display_order: Math.max(0, Number(displayOrder) || 0),
      is_featured: isFeatured,
      is_active: isActive,
    };

    try {
      if (isEdit && category) {
        await api(`/categories/${category.category_id}`, { method: 'PUT', body: payload });
        onSaved(`Categoría "${payload.name}" actualizada`);
      } else {
        await api('/categories', { method: 'POST', body: payload });
        onSaved(`Categoría "${payload.name}" creada`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la categoría');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Editar categoría' : 'Agregar categoría'}>
      <button type="button" className="modal__backdrop" aria-label="Cerrar" onClick={onClose} />
      <form className="modal__card form" onSubmit={submit}>
        <header className="modal__head">
          <h2>{isEdit ? `Editar: ${category?.name}` : 'Nueva categoría'}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="grid grid--2">
          <label>
            Nombre
            <input
              required
              minLength={2}
              maxLength={120}
              placeholder="Ej: Electroventiladores A/C"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </label>
          <label>
            Slug (URL)
            <input
              required
              minLength={2}
              maxLength={140}
              pattern="[a-z0-9-]+"
              placeholder="electroventiladores-ac"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
            />
          </label>
        </div>

        <label>
          Subtítulo corto (se muestra en la tarjeta de portada)
          <input
            maxLength={160}
            placeholder="Flujo de aire garantizado"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </label>

        <label>
          Descripción
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="Descripción opcional de la categoría..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="grid grid--2">
          <label>
            Línea de producto
            <select
              value={productLine}
              onChange={(e) => setProductLine(e.target.value as 'refrigeracion_vehicular' | 'variados_vehiculos')}
            >
              <option value="refrigeracion_vehicular">Refrigeración Vehicular</option>
              <option value="variados_vehiculos">Variados Vehículos</option>
            </select>
          </label>
          <label>
            Orden en tienda
            <input
              type="number"
              min="0"
              required
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid--2">
          <label className="check">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            Destacada en portada
          </label>
          <label className="check">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Activa en tienda
          </label>
        </div>

        {error && <p className="alert" role="alert">{error}</p>}

        <footer className="modal__foot">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </footer>
      </form>
    </div>
  );
}
