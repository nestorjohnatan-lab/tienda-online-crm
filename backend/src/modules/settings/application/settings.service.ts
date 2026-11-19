import type {
  SettingsRepositoryPort,
  StoreSettingsEntity,
  UpdateStoreSettingsInput,
} from '../domain/settings.repository.js';

export class SettingsService {
  constructor(private readonly settingsRepo: SettingsRepositoryPort) {}

  async getForStore() {
    const s = await this.settingsRepo.getSettings();
    return {
      free_shipping_threshold: s.free_shipping_threshold,
      free_shipping_enabled: s.free_shipping_enabled,
      currency: s.currency,
      bcv_rate: s.bcv_rate,
      show_bs_prices: s.show_bs_prices,
      payment_accounts: s.payment_accounts,
    };
  }

  getForCrm(): Promise<StoreSettingsEntity> {
    return this.settingsRepo.getSettings();
  }

  updateForCrm(input: UpdateStoreSettingsInput, actorUserId: number): Promise<StoreSettingsEntity> {
    return this.settingsRepo.updateSettings(input, actorUserId);
  }
}
