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
      `SELECT id AS banner_id,
              tag AS badge_text,
              titulo AS title,
              texto_destacado AS highlight_text,
              subtitulo AS subtitle,
              COALESCE(imagen_url, '') AS image_url,
              titulo AS image_alt,
              COALESCE(texto_boton, 'Explorar Catálogo') AS cta_label,
              COALESCE(enlace_url, '/catalogo') AS cta_url,
              orden AS display_order,
              activo AS is_active,
              NULL AS starts_at,
              NULL AS ends_at
         FROM banners_carrusel
        WHERE activo = 1
        ORDER BY orden ASC, id ASC`,
    )) as BannerRow[];

    return rows.map((r) => this.mapRow(r));
  }

  async listAllForCrm(): Promise<readonly BannerEntity[]> {
    const rows = (await dbPool.query(
      `SELECT id AS banner_id,
              tag AS badge_text,
              titulo AS title,
              texto_destacado AS highlight_text,
              subtitulo AS subtitle,
              COALESCE(imagen_url, '') AS image_url,
              titulo AS image_alt,
              COALESCE(texto_boton, 'Explorar Catálogo') AS cta_label,
              COALESCE(enlace_url, '/catalogo') AS cta_url,
              orden AS display_order,
              activo AS is_active,
              NULL AS starts_at,
              NULL AS ends_at
         FROM banners_carrusel
        ORDER BY orden ASC, id ASC`,
    )) as BannerRow[];

    return rows.map((r) => this.mapRow(r));
  }

  async findById(bannerId: number): Promise<BannerEntity | null> {
    const rows = (await dbPool.query(
      `SELECT id AS banner_id,
              tag AS badge_text,
              titulo AS title,
              texto_destacado AS highlight_text,
              subtitulo AS subtitle,
              COALESCE(imagen_url, '') AS image_url,
              titulo AS image_alt,
              COALESCE(texto_boton, 'Explorar Catálogo') AS cta_label,
              COALESCE(enlace_url, '/catalogo') AS cta_url,
              orden AS display_order,
              activo AS is_active,
              NULL AS starts_at,
              NULL AS ends_at
         FROM banners_carrusel
        WHERE id = ?
        LIMIT 1`,
      [bannerId],
    )) as BannerRow[];

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async create(input: UpsertBannerInput, _actorUserId: number): Promise<BannerEntity> {
    const result = (await dbPool.query(
      `INSERT INTO banners_carrusel
        (tag, titulo, texto_destacado, subtitulo, imagen_url,
         texto_boton, enlace_url, orden, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.badge_text,
        input.title,
        input.highlight_text,
        input.subtitle,
        input.image_url,
        input.cta_label,
        input.cta_url,
        input.display_order,
        input.is_active ? 1 : 0,
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
    _actorUserId: number,
  ): Promise<BannerEntity | null> {
    const res = (await dbPool.query(
      `UPDATE banners_carrusel
          SET tag = ?, titulo = ?, texto_destacado = ?, subtitulo = ?,
              imagen_url = ?, texto_boton = ?, enlace_url = ?,
              orden = ?, activo = ?
        WHERE id = ?`,
      [
        input.badge_text,
        input.title,
        input.highlight_text,
        input.subtitle,
        input.image_url,
        input.cta_label,
        input.cta_url,
        input.display_order,
        input.is_active ? 1 : 0,
        bannerId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findById(bannerId);
  }

  async updateStatus(
    bannerId: number,
    isActive: boolean,
    _actorUserId: number,
  ): Promise<BannerEntity | null> {
    const res = (await dbPool.query(
      `UPDATE banners_carrusel
          SET activo = ?
        WHERE id = ?`,
      [isActive ? 1 : 0, bannerId],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findById(bannerId);
  }

  async reorder(orderedBannerIds: readonly number[], _actorUserId: number): Promise<void> {
    await withTransaction(async (conn) => {
      for (let i = 0; i < orderedBannerIds.length; i += 1) {
        const bannerId = orderedBannerIds[i];
        await conn.query(
          `UPDATE banners_carrusel
              SET orden = ?
            WHERE id = ?`,
          [i + 1, bannerId],
        );
      }
    });
  }

  async archive(bannerId: number, _actorUserId: number): Promise<boolean> {
    const res = (await dbPool.query(
      `UPDATE banners_carrusel
          SET activo = 0
        WHERE id = ?`,
      [bannerId],
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
      starts_at: null,
      ends_at: null,
    };
  }
}
