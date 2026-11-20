import { dbPool } from '../../../shared/infrastructure/database/pool.js';
import {
  DEFAULT_PAYMENT_ACCOUNTS,
  type PaymentAccountsConfig,
  type SettingsRepositoryPort,
  type StoreSettingsEntity,
  type UpdateStoreSettingsInput,
} from '../domain/settings.repository.js';

export class MariaDbSettingsRepository implements SettingsRepositoryPort {
  async getSettings(): Promise<StoreSettingsEntity> {
    try {
      const configRows = (await dbPool.query(
        `SELECT clave, valor FROM configuracion WHERE clave IN (
          'tasa_bcv', 'moneda_principal',
          'pago_movil_banco', 'pago_movil_telefono', 'pago_movil_rif',
          'transf_banco', 'transf_cuenta', 'transf_titular', 'transf_rif',
          'zelle_email', 'zelle_titular', 'binance_pay_id', 'binance_email'
        )`,
      )) as { clave: string; valor: string }[];

      const configMap: Record<string, string> = {};
      for (const row of configRows) {
        configMap[row.clave] = row.valor;
      }

      const bcvRate = Number(configMap['tasa_bcv']) || 88.00;
      const currency = (configMap['moneda_principal'] || 'USD').toUpperCase();

      const paymentAccounts: PaymentAccountsConfig = {
        pago_movil: {
          enabled: true,
          bank: configMap['pago_movil_banco'] || 'Banesco (0134)',
          phone: configMap['pago_movil_telefono'] || '0414-0000000',
          document_id: configMap['pago_movil_rif'] || 'J-00000000-0',
          holder_name: configMap['transf_titular'] || 'Mi Empresa C.A.',
        },
        transferencia: {
          enabled: true,
          bank: configMap['transf_banco'] || 'Banesco Banco Universal',
          account_number: configMap['transf_cuenta'] || '0134-0000-00-0000000000',
          account_type: 'Corriente',
          document_id: configMap['transf_rif'] || 'J-00000000-0',
          holder_name: configMap['transf_titular'] || 'Mi Empresa C.A.',
        },
        zelle: {
          enabled: Boolean(configMap['zelle_email']),
          email: configMap['zelle_email'] || 'pagos@empresa.com',
          holder_name: configMap['zelle_titular'] || 'Mi Empresa LLC',
        },
        binance: {
          enabled: Boolean(configMap['binance_pay_id'] || configMap['binance_email']),
          pay_id: configMap['binance_pay_id'] || '',
          email: configMap['binance_email'] || '',
          holder_name: 'Binance Pay',
        },
      };

      return {
        free_shipping_threshold: 150,
        free_shipping_enabled: true,
        currency,
        bcv_rate: bcvRate,
        show_bs_prices: true,
        payment_accounts: paymentAccounts,
        updated_at: new Date().toISOString(),
      };
    } catch {
      return {
        free_shipping_threshold: 150,
        free_shipping_enabled: true,
        currency: 'USD',
        bcv_rate: 88.00,
        show_bs_prices: true,
        payment_accounts: DEFAULT_PAYMENT_ACCOUNTS,
        updated_at: new Date().toISOString(),
      };
    }
  }

  async updateSettings(
    input: UpdateStoreSettingsInput,
    _actorUserId: number,
  ): Promise<StoreSettingsEntity> {
    if (input.bcv_rate !== undefined) {
      await dbPool.query(
        `INSERT INTO configuracion (clave, valor) VALUES ('tasa_bcv', ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [String(input.bcv_rate)],
      );
    }
    return this.getSettings();
  }
}
