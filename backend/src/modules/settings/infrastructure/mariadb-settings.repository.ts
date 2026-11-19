import { dbPool } from '../../../shared/infrastructure/database/pool.js';
import {
  DEFAULT_PAYMENT_ACCOUNTS,
  type PaymentAccountsConfig,
  type SettingsRepositoryPort,
  type StoreSettingsEntity,
  type UpdateStoreSettingsInput,
} from '../domain/settings.repository.js';

interface SettingsRow {
  free_shipping_threshold: number;
  free_shipping_enabled: number;
  currency: string;
  bcv_rate: number;
  show_bs_prices: number;
  payment_accounts: string | null;
  updated_at: Date;
}

export class MariaDbSettingsRepository implements SettingsRepositoryPort {
  async getSettings(): Promise<StoreSettingsEntity> {
    const rows = (await dbPool.query(
      `SELECT free_shipping_threshold, free_shipping_enabled, currency,
              bcv_rate, show_bs_prices, payment_accounts, updated_at
         FROM store_settings
        WHERE setting_id = 1
        LIMIT 1`,
    )) as SettingsRow[];

    const row = rows[0];
    if (!row) {
      return {
        free_shipping_threshold: 150,
        free_shipping_enabled: true,
        currency: 'USD',
        bcv_rate: 50,
        show_bs_prices: true,
        payment_accounts: DEFAULT_PAYMENT_ACCOUNTS,
        updated_at: new Date().toISOString(),
      };
    }

    let paymentAccounts = DEFAULT_PAYMENT_ACCOUNTS;
    if (row.payment_accounts) {
      try {
        paymentAccounts = {
          ...DEFAULT_PAYMENT_ACCOUNTS,
          ...(JSON.parse(row.payment_accounts) as Partial<PaymentAccountsConfig>),
        };
      } catch {
        paymentAccounts = DEFAULT_PAYMENT_ACCOUNTS;
      }
    }

    return {
      free_shipping_threshold: Number(row.free_shipping_threshold),
      free_shipping_enabled: Boolean(row.free_shipping_enabled),
      currency: row.currency,
      bcv_rate: Number(row.bcv_rate ?? 50),
      show_bs_prices: Boolean(row.show_bs_prices ?? 1),
      payment_accounts: paymentAccounts,
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async updateSettings(
    input: UpdateStoreSettingsInput,
    actorUserId: number,
  ): Promise<StoreSettingsEntity> {
    await dbPool.query(
      `INSERT INTO store_settings
        (setting_id, free_shipping_threshold, free_shipping_enabled, currency,
         bcv_rate, show_bs_prices, payment_accounts, updated_by)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         free_shipping_threshold = VALUES(free_shipping_threshold),
         free_shipping_enabled = VALUES(free_shipping_enabled),
         currency = VALUES(currency),
         bcv_rate = VALUES(bcv_rate),
         show_bs_prices = VALUES(show_bs_prices),
         payment_accounts = VALUES(payment_accounts),
         updated_by = VALUES(updated_by)`,
      [
        input.free_shipping_threshold,
        input.free_shipping_enabled ? 1 : 0,
        input.currency.toUpperCase(),
        input.bcv_rate,
        input.show_bs_prices ? 1 : 0,
        JSON.stringify(input.payment_accounts),
        actorUserId,
      ],
    );

    return this.getSettings();
  }
}
