import { useState } from 'react';
import { api } from '../../shared/api/http';
import { useQuery, money } from '../../shared/api/useQuery';
import { PageState } from '../../shared/ui/molecules/Common';
import { CategoryModal, type CrmCategoryDetail } from './CategoryModal';
import { ProductModal, type CrmProduct } from './ProductModal';

export function InventoryPage() {
  const [tab, setTab] = useState<'productos' | 'categorias'>('productos');
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState('');

  const prodPath = `/products?page_size=100${lowOnly ? '&low_stock_only=true' : ''}${search ? `&q=${encodeURIComponent(search)}` : ''}`;
  const productsQ = useQuery<{ items: CrmProduct[] }>(prodPath);
  const categoriesQ = useQuery<{ items: CrmCategoryDetail[] }>('/categories');

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalProduct, setModalProduct] = useState<CrmProduct | null | undefined>(undefined);
  const [modalCategory, setModalCategory] = useState<CrmCategoryDetail | null | undefined>(undefined);

  const move = async (p: CrmProduct, type: 'entrada' | 'ajuste_negativo', quantity: number) => {
    setBusy(true);
    setMsg(null);
    try {
      await api('/inventory/movements', {
        method: 'POST',
        idempotent: true,
        body: {
          product_id: p.product_id,
          movement_type: type,
          quantity,
          reference_code: 'AJUSTE-CRM',
          notes: 'Ajuste rápido desde el CRM',
        },
      });
      setMsg(`Stock de ${p.sku} actualizado`);
      productsQ.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="head">
        <div>
          <h1>Inventario</h1>
          <div className="tabs" role="tablist" aria-label="Ramas de inventario">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'productos'}
              className={`tab ${tab === 'productos' ? 'is-active' : ''}`}
              onClick={() => setTab('productos')}
            >
              Productos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'categorias'}
              className={`tab ${tab === 'categorias' ? 'is-active' : ''}`}
              onClick={() => setTab('categorias')}
            >
              Categorías ({categoriesQ.data?.items.length ?? 0})
            </button>
          </div>
        </div>

        {tab === 'productos' ? (
          <button type="button" className="btn btn--primary" onClick={() => setModalProduct(null)}>
            + Agregar producto
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setModalCategory(null)}>
            + Agregar categoría
          </button>
        )}
      </div>

      {msg && <p className="notice" style={{ marginTop: '0.75rem' }} role="status">{msg}</p>}

      {tab === 'productos' ? (
        <>
          <div className="toolbar" style={{ marginTop: '0.75rem' }}>
            <input
              type="search"
              placeholder="Buscar por nombre, SKU u OEM"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar"
            />
            <label className="check">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              Solo stock bajo
            </label>
          </div>

          <PageState loading={productsQ.loading} error={productsQ.error}>
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código / Producto</th>
                    <th>Modelo</th>
                    <th className="num">Costo</th>
                    <th className="num">PVP</th>
                    <th className="num">Stock</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productsQ.data?.items.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        <strong>{p.name}</strong>
                        <small className="mono muted">{p.sku}</small>
                      </td>
                      <td>{p.model_name ?? '—'}</td>
                      <td className="num muted">{money(p.cost_price, p.currency)}</td>
                      <td className="num"><strong>{money(p.price, p.currency)}</strong></td>
                      <td className="num">
                        <span className={`pill ${p.is_low_stock ? 'pill--cancelado' : 'pill--entregado'}`}>
                          {p.stock_quantity} / mín. {p.min_stock_threshold}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="btn btn--sm" disabled={busy} onClick={() => setModalProduct(p)}>Editar</button>
                        <button className="btn btn--sm btn--ok" disabled={busy} onClick={() => move(p, 'entrada', 5)}>+5</button>
                        <button className="btn btn--sm" disabled={busy || p.stock_quantity < 1} onClick={() => move(p, 'ajuste_negativo', 1)}>−1</button>
                      </td>
                    </tr>
                  ))}
                  {productsQ.data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">Sin resultados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PageState>
        </>
      ) : (
        <div style={{ marginTop: '0.75rem' }}>
          <PageState loading={categoriesQ.loading} error={categoriesQ.error}>
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Categoría</th>
                    <th>Línea</th>
                    <th className="num">Productos</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesQ.data?.items.map((c) => (
                    <tr key={c.category_id}>
                      <td className="mono">#{c.display_order}</td>
                      <td>
                        <strong>{c.name}</strong>
                        <small className="muted">{c.subtitle ?? c.slug}</small>
                      </td>
                      <td>{c.product_line === 'refrigeracion_vehicular' ? '❄ Refrigeración A/C' : 'Variados'}</td>
                      <td className="num">{c.active_products_count}</td>
                      <td>
                        <span className={`pill ${c.is_active ? 'pill--entregado' : 'pill--cancelado'}`}>
                          {c.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="btn btn--sm" onClick={() => setModalCategory(c)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                  {categoriesQ.data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">No hay categorías creadas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PageState>
        </div>
      )}

      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(undefined)}
          onSaved={(text) => {
            setModalProduct(undefined);
            setMsg(text);
            productsQ.reload();
            categoriesQ.reload();
          }}
        />
      )}

      {modalCategory !== undefined && (
        <CategoryModal
          category={modalCategory}
          defaultOrder={(categoriesQ.data?.items.length ?? 0) + 1}
          onClose={() => setModalCategory(undefined)}
          onSaved={(text) => {
            setModalCategory(undefined);
            setMsg(text);
            categoriesQ.reload();
          }}
        />
      )}
    </>
  );
}
