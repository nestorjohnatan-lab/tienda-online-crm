export interface BannerEntity {
  readonly banner_id: number;
  readonly badge_text: string | null;
  readonly title: string;
  readonly highlight_text: string | null;
  readonly subtitle: string | null;
  readonly image_url: string;
  readonly image_alt: string;
  readonly cta_label: string;
  readonly cta_url: string;
  readonly display_order: number;
  readonly is_active: boolean;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
}

export interface UpsertBannerInput {
  readonly badge_text: string | null;
  readonly title: string;
  readonly highlight_text: string | null;
  readonly subtitle: string | null;
  readonly image_url: string;
  readonly image_alt: string;
  readonly cta_label: string;
  readonly cta_url: string;
  readonly display_order: number;
  readonly is_active: boolean;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
}

export interface BannerRepositoryPort {
  listActiveForStore(): Promise<readonly BannerEntity[]>;
  listAllForCrm(): Promise<readonly BannerEntity[]>;
  findById(bannerId: number): Promise<BannerEntity | null>;
  create(input: UpsertBannerInput, actorUserId: number): Promise<BannerEntity>;
  update(bannerId: number, input: UpsertBannerInput, actorUserId: number): Promise<BannerEntity | null>;
  updateStatus(bannerId: number, isActive: boolean, actorUserId: number): Promise<BannerEntity | null>;
  reorder(orderedBannerIds: readonly number[], actorUserId: number): Promise<void>;
  archive(bannerId: number, actorUserId: number): Promise<boolean>;
}
