import { useState, type FormEvent } from 'react';
import { money } from '../../shared/api/useQuery';

export interface PricingValues {
  cost_price: number;
  profit_margin_pct: number;
  tax_rate_pct: number;
  sale_price: number;
}

interface PricingModalProps {
  initial: PricingValues;
  onApply(values: PricingValues): void;
  onClose(): void;
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

function computePvp(cost: number, marginPct: number, taxPct: number): number {
  return round2(cost * (1 + marginPct / 100) * (1 + taxPct / 100));
}

function computeMarginFromPvp(cost: number, pvp: number, taxPct: number): number {
  if (cost <= 0) return 0;
  const basePrice = pvp / (1 + taxPct / 100);
  return Math.max(0, round2(((basePrice - cost) / cost) * 100));
}

export function PricingModal({ initial, onApply, onClose }: PricingModalProps) {
  const [cost, setCost] = useState<string>(String(initial.cost_price));
  const [margin, setMargin] = useState<string>(String(initial.profit_margin_pct));
  const [tax, setTax] = useState<string>(String(initial.tax_rate_pct));
  const [pvp, setPvp] = useState<string>(String(initial.sale_price));

  const nCost = Math.max(0, Number(cost) || 0);
  const nMargin = Math.max(0, Number(margin) || 0);
  const nTax = Math.max(0, Number(tax) || 0);
  const nPvp = Math.max(0, Number(pvp) || 0);

  const baseWithoutTax = round2(nCost * (1 + nMargin / 100));
  const netProfit = round2(baseWithoutTax - nCost);
  const taxAmount = round2(nPvp - baseWithoutTax);

  const handleCostChange = (val: string) => {
    setCost(val);
    const c = Math.max(0, Number(val) || 0);
    setPvp(String(computePvp(c, nMargin, nTax)));
  };

  const handleMarginChange = (val: string) => {
    setMargin(val);
    const m = Math.max(0, Number(val) || 0);
    setPvp(String(computePvp(nCost, m, nTax)));
  };

  const handleTaxChange = (val: string) => {
    setTax(val);
    const t = Math.max(0, Number(val) || 0);
    setPvp(String(computePvp(nCost, nMargin, t)));
  };

  const handlePvpChange = (val: string) => {
    setPvp(val);
    const p = Math.max(0, Number(val) || 0);
    if (nCost > 0) {
      setMargin(String(computeMarginFromPvp(nCost, p, nTax)));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply({
      cost_price: round2(nCost),
      profit_margin_pct: round2(nMargin),
      tax_rate_pct: round2(nTax),
      sale_price: round2(nPvp),
    });
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Precios y Costos">
      <button type="button" className="modal__backdrop" aria-label="Cerrar" onClick={onClose} />
      <form className="modal__card modal__card--sm form" onSubmit={submit}>
        <header className="modal__head">
          <h2>Precios y Costos</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="grid grid--2">
          <label>
            Costo unitario ($)
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={cost}
              onChange={(e) => handleCostChange(e.target.value)}
            />
          </label>
          <label>
            % de Utilidad
            <input
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              required
              value={margin}
              onChange={(e) => handleMarginChange(e.target.value)}
            />
          </label>
          <label>
            Impuesto (%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={tax}
              onChange={(e) => handleTaxChange(e.target.value)}
            />
          </label>
          <label>
            PVP Final ($)
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={pvp}
              onChange={(e) => handlePvpChange(e.target.value)}
            />
          </label>
        </div>

        <div className="pricing-summary">
          <div><small>Costo base</small><strong className="num">{money(nCost)}</strong></div>
          <div><small>Ganancia neta</small><strong className="num tone-ok">{money(netProfit)}</strong></div>
          <div><small>Impuesto</small><strong className="num">{money(taxAmount)}</strong></div>
          <div><small>PVP</small><strong className="num accent">{money(nPvp)}</strong></div>
        </div>

        <footer className="modal__foot">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary">Aplicar precios</button>
        </footer>
      </form>
    </div>
  );
}
