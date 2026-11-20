import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { dbPool } from '../../../shared/infrastructure/database/pool.js';
import type {
  CustomerEntity,
  CustomerRepositoryPort,
  UpsertCustomerInput,
} from '../domain/customer.repository.js';

interface SvaClienteRow {
  id: number;
  cedula_rif: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  created_at: Date;
}

export class MariaDbCustomerRepository implements CustomerRepositoryPort {
  async list(params: {
    q?: string | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CustomerEntity>> {
    const conditions: string[] = ['1 = 1'];
    const sqlParams: unknown[] = [];

    if (params.q) {
      conditions.push('(nombre LIKE ? OR email LIKE ? OR telefono LIKE ? OR cedula_rif LIKE ?)');
      const like = `%${params.q}%`;
      sqlParams.push(like, like, like, like);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total FROM clientes WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT id, cedula_rif, nombre, direccion, telefono, whatsapp, email, created_at
         FROM clientes
        WHERE ${whereClause}
        ORDER BY id DESC
        LIMIT ? OFFSET ?`,
      [...sqlParams, params.page_size, offset],
    )) as SvaClienteRow[];

    return {
      items: rows.map((r) => this.mapRow(r)),
      pagination: {
        page: params.page,
        page_size: params.page_size,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / params.page_size)),
      },
    };
  }

  async findById(customerId: number): Promise<CustomerEntity | null> {
    const rows = (await dbPool.query(
      `SELECT id, cedula_rif, nombre, direccion, telefono, whatsapp, email, created_at
         FROM clientes
        WHERE id = ?
        LIMIT 1`,
      [customerId],
    )) as SvaClienteRow[];
    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async create(input: UpsertCustomerInput): Promise<CustomerEntity> {
    const res = (await dbPool.query(
      `INSERT INTO clientes
        (cedula_rif, nombre, direccion, telefono, email, whatsapp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.document_id || 'V-00000000',
        input.full_name,
        input.shipping_address,
        input.phone,
        input.email,
        input.phone,
      ],
    )) as { insertId: number };

    const created = await this.findById(Number(res.insertId));
    if (!created) throw new Error('Invariant broken: cliente recién creado no encontrado');
    return created;
  }

  async update(customerId: number, input: UpsertCustomerInput): Promise<CustomerEntity | null> {
    const res = (await dbPool.query(
      `UPDATE clientes
          SET cedula_rif = ?, nombre = ?, direccion = ?, telefono = ?, email = ?
        WHERE id = ?`,
      [
        input.document_id || 'V-00000000',
        input.full_name,
        input.shipping_address,
        input.phone,
        input.email,
        customerId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findById(customerId);
  }

  private mapRow(r: SvaClienteRow): CustomerEntity {
    return {
      customer_id: Number(r.id),
      full_name: r.nombre,
      email: r.email,
      phone: r.telefono ?? '',
      document_id: r.cedula_rif,
      shipping_address: r.direccion,
      city: 'Venezuela',
      vehicle_notes: null,
      crm_notes: r.whatsapp ? `WhatsApp: ${r.whatsapp}` : null,
      created_at: new Date(r.created_at).toISOString(),
    };
  }
}
