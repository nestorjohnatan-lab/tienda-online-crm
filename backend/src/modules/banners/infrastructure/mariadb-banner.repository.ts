import { dbPool, withTransaction } from '../../../shared/infrastructure/database/pool.js';
import type {
  BannerEntity,
  BannerRepositoryPort,
  UpsertBannerInput,
} from '../domain/banner.repository.js';

interface BannerRow {
  banner_id: number;
  badge_text: string | null;
  title: string;
  highlight_text: string | null;
  subtitle: string | null;
  image_url: string;
  image_alt: string;
  cta_label: string;
  cta_url: string;
  display_order: number;
  is_active: number;
  starts_at: Date | null;
  ends_at: Date | null;
}

export class MariaDbBannerRepository implements BannerRepositoryPort {
  async listActiveForStore(): Promise<readonly BannerEntity[]> {
    const rows = (await dbPool.query(
      `SELECT banner_id, badge_text, title, highlight_text, subtitle,
              image_url, image_alt, cta_label, cta_url, display_order,
              is_active, starts_at, ends_at
         FROM banners
        WHERE deleted_at IS NULL
          AND is_active = 1
          AND (starts_at IS NULL OR starts_at <= NOW(3))
          AND (ends_at IS NULL OR ends_at >= NOW(3))
        ORDER BY display_order ASC, banner_id ASC`,
    )) as BannerRow[];

    return rows.map((r) => this.mapRow(r));
  }

  async listAllForCrm(): Promise<readonly BannerEntity[]> {
    const rows = (await dbPool.query(
      `SELECT banner_id, badge_text, title, highlight_text, subtitle,
              image_url, image_alt, cta_label, cta_url, display_order,
              is_active, starts_at, ends_at
         FROM banners
        WHERE deleted_at IS NULL
        ORDER BY display_order ASC, banner_id ASC`,
    )) as BannerRow[];

    return rows.map((r) => this.mapRow(r));
  }

  async findById(bannerId: number): Promise<BannerEntity | null> {
    const rows = (await dbPool.query(
      `SELECT banner_id, badge_text, title, highlight_text, subtitle,
              image_url, image_alt, cta_label, cta_url, display_order,
              is_active, starts_at, ends_at
         FROM banners
        WHERE banner_id = ? AND deleted_at IS NULL
        LIMIT 1`,
      [bannerId],
    )) as BannerRow[];

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async create(input: UpsertBannerInput, actorUserId: number): Promise<BannerEntity> {
    const result = (await dbPool.query(
      `INSERT INTO banners
        (badge_text, title, highlight_text, subtitle, image_url, image_alt,
         cta_label, cta_url, display_order, is_active, starts_at, ends_at,
         created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.badge_text,
        input.title,
        input.highlight_text,
        input.subtitle,
        input.image_url,
        input.image_alt,
        input.cta_label,
        input.cta_url,
        input.display_order,
        input.is_active ? 1 : 0,
        input.starts_at ? new Date(input.starts_at) : null,
        input.ends_at ? new Date(input.ends_at) : null,
        actorUserId,
        actorUserId,
      ],
    )) as { insertId: number };

    const created = await this.findById(Number(result.insertId));
    if (!created) {
      throw new Error('Invariant broken: banner recién creado no encontrado');
    }
    return created;
  }

  async update(
    bannerId: number,
    input: UpsertBannerInput,
    actorUserId: number,
  ): Promise<BannerEntity | null> {
    const res = (await dbPool.query(
      `UPDATE banners
          SET badge_text = ?, title = ?, highlight_text = ?, subtitle = ?,
              image_url = ?, image_alt = ?, cta_label = ?, cta_url = ?,
              display_order = ?, is_active = ?, starts_at = ?, ends_at = ?,
              updated_by = ?
        WHERE banner_id = ? AND deleted_at IS NULL`,
      [
        input.badge_text,
        input.title,
        input.highlight_text,
        input.subtitle,
        input.image_url,
        input.image_alt,
        input.cta_label,
        input.cta_url,
        input.display_order,
        input.is_active ? 1 : 0,
        input.starts_at ? new Date(input.starts_at) : null,
        input.ends_at ? new Date(input.ends_at) : null,
        actorUserId,
        bannerId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findById(bannerId);
  }

  async updateStatus(
    bannerId: number,
    isActive: boolean,
    actorUserId: number,
  ): Promise<BannerEntity | null> {
    const res = (await dbPool.query(
      `UPDATE banners
          SET is_active = ?, updated_by = ?
        WHERE banner_id = ? AND deleted_at IS NULL`,
      [isActive ? 1 : 0, actorUserId, bannerId],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findById(bannerId);
  }

  async reorder(orderedBannerIds: readonly number[], actorUserId: number): Promise<void> {
    await withTransaction(async (conn) => {
      for (let i = 0; i < orderedBannerIds.length; i += 1) {
        const bannerId = orderedBannerIds[i];
        await conn.query(
          `UPDATE banners
              SET display_order = ?, updated_by = ?
            WHERE banner_id = ? AND deleted_at IS NULL`,
          [i + 1, actorUserId, bannerId],
        );
      }
    });
  }

  async archive(bannerId: number, actorUserId: number): Promise<boolean> {
    const res = (await dbPool.query(
      `UPDATE banners
          SET is_active = 0, deleted_at = NOW(3), updated_by = ?
        WHERE banner_id = ? AND deleted_at IS NULL`,
      [actorUserId, bannerId],
    )) as { affectedRows: number };

    return res.affectedRows > 0;
  }

  private mapRow(row: BannerRow): BannerEntity {
    return {
      banner_id: Number(row.banner_id),
      badge_text: row.badge_text,
      title: row.title,
      highlight_text: row.highlight_text,
      subtitle: row.subtitle,
      image_url: row.image_url,
      image_alt: row.image_alt,
      cta_label: row.cta_label,
      cta_url: row.cta_url,
      display_order: Number(row.display_order),
      is_active: Boolean(row.is_active),
      starts_at: row.starts_at ? new Date(row.starts_at).toISOString() : null,
      ends_at: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    };
  }
}
