import { DomainRuleError, NotFoundError } from '../../../shared/domain/app-error.js';
import type {
  BannerEntity,
  BannerRepositoryPort,
  UpsertBannerInput,
} from '../domain/banner.repository.js';

export class BannerService {
  constructor(private readonly bannerRepo: BannerRepositoryPort) {}

  async listForStore() {
    const banners = await this.bannerRepo.listActiveForStore();
    return banners.map((b) => ({
      banner_id: b.banner_id,
      badge_text: b.badge_text,
      title: b.title,
      highlight_text: b.highlight_text,
      subtitle: b.subtitle,
      image_url: b.image_url,
      image_alt: b.image_alt,
      cta_label: b.cta_label,
      cta_url: b.cta_url,
      display_order: b.display_order,
    }));
  }

  async listForCrm(): Promise<readonly BannerEntity[]> {
    return this.bannerRepo.listAllForCrm();
  }

  async create(input: UpsertBannerInput, actorUserId: number): Promise<BannerEntity> {
    this.validateSchedule(input.starts_at, input.ends_at);
    return this.bannerRepo.create(input, actorUserId);
  }

  async update(
    bannerId: number,
    input: UpsertBannerInput,
    actorUserId: number,
  ): Promise<BannerEntity> {
    this.validateSchedule(input.starts_at, input.ends_at);
    const updated = await this.bannerRepo.update(bannerId, input, actorUserId);
    if (!updated) {
      throw new NotFoundError(`Banner ${bannerId} no encontrado`);
    }
    return updated;
  }

  async updateStatus(
    bannerId: number,
    isActive: boolean,
    actorUserId: number,
  ): Promise<BannerEntity> {
    const updated = await this.bannerRepo.updateStatus(bannerId, isActive, actorUserId);
    if (!updated) {
      throw new NotFoundError(`Banner ${bannerId} no encontrado`);
    }
    return updated;
  }

  async reorder(orderedBannerIds: readonly number[], actorUserId: number): Promise<readonly BannerEntity[]> {
    const uniqueCount = new Set(orderedBannerIds).size;
    if (uniqueCount !== orderedBannerIds.length) {
      throw new DomainRuleError('La lista de banners contiene IDs duplicados');
    }
    await this.bannerRepo.reorder(orderedBannerIds, actorUserId);
    return this.bannerRepo.listAllForCrm();
  }

  async archive(bannerId: number, actorUserId: number): Promise<void> {
    const ok = await this.bannerRepo.archive(bannerId, actorUserId);
    if (!ok) {
      throw new NotFoundError(`Banner ${bannerId} no encontrado`);
    }
  }

  private validateSchedule(startsAt: string | null, endsAt: string | null): void {
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new DomainRuleError('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }
}
