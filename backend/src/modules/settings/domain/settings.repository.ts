export interface PaymentAccountsConfig {
  readonly pago_movil: {
    readonly enabled: boolean;
    readonly bank: string;
    readonly phone: string;
    readonly document_id: string;
    readonly holder_name: string;
  };
  readonly transferencia: {
    readonly enabled: boolean;
    readonly bank: string;
    readonly account_number: string;
    readonly account_type: string;
    readonly document_id: string;
    readonly holder_name: string;
  };
  readonly zelle: {
    readonly enabled: boolean;
    readonly email: string;
    readonly holder_name: string;
  };
  readonly binance: {
    readonly enabled: boolean;
    readonly pay_id: string;
    readonly email: string;
    readonly holder_name: string;
  };
}

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountsConfig = {
  pago_movil: {
    enabled: true,
    bank: 'Banesco (0134)',
    phone: '0414-5550199',
    document_id: 'J-50123456-0',
    holder_name: 'AutoFrío PRO C.A.',
  },
  transferencia: {
    enabled: true,
    bank: 'Banesco',
    account_number: '0134-0946-33-0001234567',
    account_type: 'Corriente',
    document_id: 'J-50123456-0',
    holder_name: 'AutoFrío PRO C.A.',
  },
  zelle: {
    enabled: true,
    email: 'pagos@autofriopro-demo.com',
    holder_name: 'AutoFrio PRO LLC',
  },
  binance: {
    enabled: true,
    pay_id: '518904321',
    email: 'binance@autofriopro-demo.com',
    holder_name: 'AutoFrioPro_Pay',
  },
};

export interface StoreSettingsEntity {
  readonly free_shipping_threshold: number;
  readonly free_shipping_enabled: boolean;
  readonly currency: string;
  readonly bcv_rate: number;
  readonly show_bs_prices: boolean;
  readonly payment_accounts: PaymentAccountsConfig;
  readonly updated_at: string;
}

export interface UpdateStoreSettingsInput {
  readonly free_shipping_threshold: number;
  readonly free_shipping_enabled: boolean;
  readonly currency: string;
  readonly bcv_rate: number;
  readonly show_bs_prices: boolean;
  readonly payment_accounts: PaymentAccountsConfig;
}

export interface SettingsRepositoryPort {
  getSettings(): Promise<StoreSettingsEntity>;
  updateSettings(input: UpdateStoreSettingsInput, actorUserId: number): Promise<StoreSettingsEntity>;
}
