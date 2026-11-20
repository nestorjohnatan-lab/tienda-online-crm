import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../shared/api/http';
import { useQuery, dateTime } from '../../shared/api/useQuery';
import { PageState } from '../../shared/ui/molecules/Common';

interface PaymentAccounts {
  pago_movil: { enabled: boolean; bank: string; phone: string; document_id: string; holder_name: string };
  transferencia: { enabled: boolean; bank: string; account_number: string; account_type: string; document_id: string; holder_name: string };
  zelle: { enabled: boolean; email: string; holder_name: string };
  binance: { enabled: boolean; pay_id: string; email: string; holder_name: string };
}

interface StoreSettings {
  free_shipping_threshold: number;
  free_shipping_enabled: boolean;
  currency: string;
  bcv_rate: number;
  show_bs_prices: boolean;
  payment_accounts: PaymentAccounts;
  updated_at: string;
}

const EMPTY_ACCOUNTS: PaymentAccounts = {
  pago_movil: {
    enabled: true,
    bank: 'Banesco (0134)',
    phone: '0414-5550199',
    document_id: 'J-50123456-0',
    holder_name: 'NEXORA C.A.',
  },
  transferencia: {
    enabled: true,
    bank: 'Banesco',
    account_number: '0134-0946-33-0001234567',
    account_type: 'Corriente',
    document_id: 'J-50123456-0',
    holder_name: 'NEXORA C.A.',
  },
  zelle: {
    enabled: true,
    email: 'pagos@nexora-demo.com',
    holder_name: 'NEXORA LLC',
  },
  binance: {
    enabled: true,
    pay_id: '518904321',
    email: 'binance@nexora-demo.com',
    holder_name: 'Nexora_Pay',
  },
};

export function StoreSettingsPage() {
  const q = useQuery<StoreSettings>('/settings');
  const [accounts, setAccounts] = useState<PaymentAccounts>(EMPTY_ACCOUNTS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (q.data?.payment_accounts) {
      setAccounts(q.data.payment_accounts);
    }
  }, [q.data]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    try {
      await api('/settings', {
        method: 'PUT',
        body: {
          free_shipping_threshold: Number(f.get('free_shipping_threshold')),
          free_shipping_enabled: f.get('free_shipping_enabled') === 'on',
          currency: String(f.get('currency')).trim().toUpperCase(),
          bcv_rate: Number(f.get('bcv_rate')),
          show_bs_prices: f.get('show_bs_prices') === 'on',
          payment_accounts: accounts,
        },
      });
      setMsg('Configuración, tasa BCV y cuentas de pago actualizadas');
      q.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Configuración de tienda</h1>
      <p className="muted">Controla la tasa BCV, envío gratis y los datos de cobro digital que ve el cliente en el checkout.</p>
      {msg && <p className="notice" role="status">{msg}</p>}

      <PageState loading={q.loading} error={q.error}>
        {q.data && (
          <form className="form" style={{ maxWidth: '58rem' }} onSubmit={onSubmit}>
            <section className="card form">
              <h2>Moneda, Tasa BCV y Envío Gratis</h2>
              <div className="grid grid--2">
                <label>
                  Tasa BCV (Bs por 1 USD)
                  <input name="bcv_rate" type="number" step="0.0001" min="0.01" required defaultValue={q.data.bcv_rate} />
                </label>
                <label>
                  Moneda base (ISO)
                  <input name="currency" type="text" minLength={3} maxLength={3} required defaultValue={q.data.currency} />
                </label>
              </div>
              <div className="grid grid--2">
                <label>
                  Monto mínimo envío gratis (USD)
                  <input name="free_shipping_threshold" type="number" step="0.01" min="0" required defaultValue={q.data.free_shipping_threshold} />
                </label>
                <div className="stack" style={{ alignContent: 'center' }}>
                  <label className="check">
                    <input name="show_bs_prices" type="checkbox" defaultChecked={q.data.show_bs_prices} />
                    Reflejar precios en Bs en la tienda
                  </label>
                  <label className="check">
                    <input name="free_shipping_enabled" type="checkbox" defaultChecked={q.data.free_shipping_enabled} />
                    Mostrar barra de envío gratis
                  </label>
                </div>
              </div>
            </section>

            {/* Tarjetas de Formas de Pago Digitales */}
            <div className="grid grid--2">
              {/* Tarjeta 1: Pago Móvil */}
              <section className="card form">
                <div className="head">
                  <h2>Pago Móvil</h2>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={accounts.pago_movil.enabled}
                      onChange={(e) => setAccounts({ ...accounts, pago_movil: { ...accounts.pago_movil, enabled: e.target.checked } })}
                    />
                    Activo
                  </label>
                </div>
                <label>
                  Banco
                  <input placeholder="Banesco / Mercantil / BDV" value={accounts.pago_movil.bank} onChange={(e) => setAccounts({ ...accounts, pago_movil: { ...accounts.pago_movil, bank: e.target.value } })} />
                </label>
                <label>
                  Teléfono afiliado
                  <input placeholder="0414-0000000" value={accounts.pago_movil.phone} onChange={(e) => setAccounts({ ...accounts, pago_movil: { ...accounts.pago_movil, phone: e.target.value } })} />
                </label>
                <div className="grid grid--2">
                  <label>
                    Cédula / RIF
                    <input placeholder="J-12345678-9" value={accounts.pago_movil.document_id} onChange={(e) => setAccounts({ ...accounts, pago_movil: { ...accounts.pago_movil, document_id: e.target.value } })} />
                  </label>
                  <label>
                    Titular
                    <input placeholder="NEXORA C.A." value={accounts.pago_movil.holder_name} onChange={(e) => setAccounts({ ...accounts, pago_movil: { ...accounts.pago_movil, holder_name: e.target.value } })} />
                  </label>
                </div>
              </section>

              {/* Tarjeta 2: Transferencia Bancaria */}
              <section className="card form">
                <div className="head">
                  <h2>Transferencia Bancaria</h2>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={accounts.transferencia.enabled}
                      onChange={(e) => setAccounts({ ...accounts, transferencia: { ...accounts.transferencia, enabled: e.target.checked } })}
                    />
                    Activo
                  </label>
                </div>
                <div className="grid grid--2">
                  <label>
                    Banco
                    <input placeholder="Banesco" value={accounts.transferencia.bank} onChange={(e) => setAccounts({ ...accounts, transferencia: { ...accounts.transferencia, bank: e.target.value } })} />
                  </label>
                  <label>
                    Tipo de cuenta
                    <input placeholder="Corriente" value={accounts.transferencia.account_type} onChange={(e) => setAccounts({ ...accounts, transferencia: { ...accounts.transferencia, account_type: e.target.value } })} />
                  </label>
                </div>
                <label>
                  Número de cuenta
                  <input placeholder="0134-0000-00-0000000000" value={accounts.transferencia.account_number} onChange={(e) => setAccounts({ ...accounts, transferencia: { ...accounts.transferencia, account_number: e.target.value } })} />
                </label>
                <div className="grid grid--2">
                  <label>
                    Cédula / RIF
                    <input placeholder="J-12345678-9" value={accounts.transferencia.document_id} onChange={(e) => setAccounts({ ...accounts, transferencia: { ...accounts.transferencia, document_id: e.target.value } })} />
                  </label>
                  <label>
                    Titular
                    <input placeholder="NEXORA C.A." value={accounts.transferencia.holder_name} onChange={(e) => setAccounts({ ...accounts, transferencia: { ...accounts.transferencia, holder_name: e.target.value } })} />
                  </label>
                </div>
              </section>

              {/* Tarjeta 3: Zelle */}
              <section className="card form">
                <div className="head">
                  <h2>Zelle</h2>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={accounts.zelle.enabled}
                      onChange={(e) => setAccounts({ ...accounts, zelle: { ...accounts.zelle, enabled: e.target.checked } })}
                    />
                    Activo
                  </label>
                </div>
                <label>
                  Correo Zelle
                  <input type="email" placeholder="pagos@nexora.com" value={accounts.zelle.email} onChange={(e) => setAccounts({ ...accounts, zelle: { ...accounts.zelle, email: e.target.value } })} />
                </label>
                <label>
                  Titular de la cuenta
                  <input placeholder="NEXORA LLC" value={accounts.zelle.holder_name} onChange={(e) => setAccounts({ ...accounts, zelle: { ...accounts.zelle, holder_name: e.target.value } })} />
                </label>
              </section>

              {/* Tarjeta 4: Binance Pay */}
              <section className="card form">
                <div className="head">
                  <h2>Binance Pay</h2>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={accounts.binance.enabled}
                      onChange={(e) => setAccounts({ ...accounts, binance: { ...accounts.binance, enabled: e.target.checked } })}
                    />
                    Activo
                  </label>
                </div>
                <label>
                  Binance Pay ID
                  <input placeholder="123456789" value={accounts.binance.pay_id} onChange={(e) => setAccounts({ ...accounts, binance: { ...accounts.binance, pay_id: e.target.value } })} />
                </label>
                <div className="grid grid--2">
                  <label>
                    Correo Binance
                    <input type="email" placeholder="binance@nexora.com" value={accounts.binance.email} onChange={(e) => setAccounts({ ...accounts, binance: { ...accounts.binance, email: e.target.value } })} />
                  </label>
                  <label>
                    Alias / Titular
                    <input placeholder="Nexora_Pay" value={accounts.binance.holder_name} onChange={(e) => setAccounts({ ...accounts, binance: { ...accounts.binance, holder_name: e.target.value } })} />
                  </label>
                </div>
              </section>
            </div>

            <div className="head">
              <small className="muted">Última actualización: {dateTime(q.data.updated_at)}</small>
              <button className="btn btn--primary" disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar toda la configuración'}
              </button>
            </div>
          </form>
        )}
      </PageState>
    </>
  );
}
