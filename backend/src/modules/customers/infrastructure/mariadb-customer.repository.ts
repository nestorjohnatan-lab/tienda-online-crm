import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { dbPool } from '../../../shared/infrastructure/database/pool.js';
import type {
  CustomerEntity,
  CustomerRepositoryPort,
  UpsertCustomerInput,
} from '../domain/customer.repository.js';

interface CustomerRow {
  customer_id: number;
  full_name: string;
  email: string | null;
  phone: string;
  document_id: string | null;
  shipping_address: string | null;
  city: string | null;
  vehicle_notes: string | null;
  crm_notes: string | null;
  created_at: Date;
}

export class MariaDbCustomerRepository implements CustomerRepositoryPort {
  async list(params: {
    q?: string | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CustomerEntity>> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const sqlParams: unknown[] = [];

    if (params.q) {
      conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR document_id LIKE ?)');
      const like = `%${params.q}%`;
      sqlParams.push(like, like, like, like);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total FROM customers WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT customer_id, full_name, email, phone, document_id,
              shipping_address, city, vehicle_notes, crm_notes, created_at
         FROM customers
        WHERE ${whereClause}
        ORDER BY created_at DESC, customer_id DESC
        LIMIT ? OFFSET ?`,
      [...sqlParams, params.page_size, offset],
    )) as CustomerRow[];

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
      `SELECT customer_id, full_name, email, phone, document_id,
              shipping_address, city, vehicle_notes, crm_notes, created_at
         FROM customers
        WHERE customer_id = ? AND deleted_at IS NULL
        LIMIT 1`,
      [customerId],
    )) as CustomerRow[];
    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async create(input: UpsertCustomerInput): Promise<CustomerEntity> {
    const res = (await dbPool.query(
      `INSERT INTO customers
        (full_name, email, phone, document_id, shipping_address, city, vehicle_notes, crm_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.full_name,
        input.email,
        input.phone,
        input.document_id,
        input.shipping_address,
        input.city,
        input.vehicle_notes,
        input.crm_notes,
      ],
    )) as { insertId: number };

    const created = await this.findById(Number(res.insertId));
    if (!created) throw new Error('Invariant broken: cliente recién creado no encontrado');
    return created;
  }

  async update(customerId: number, input: UpsertCustomerInput): Promise<CustomerEntity | null> {
    const res = (await dbPool.query(
      `UPDATE customers
          SET full_name = ?, email = ?, phone = ?, document_id = ?,
              shipping_address = ?, city = ?, vehicle_notes = ?, crm_notes = ?
        WHERE customer_id = ? AND deleted_at IS NULL`,
      [
        input.full_name,
        input.email,
        input.phone,
        input.document_id,
        input.shipping_address,
        input.city,
        input.vehicle_notes,
        input.crm_notes,
        customerId,
      ],
    )) as { affectedRows: number };

    if (res.affectedRows === 0) return null;
    return this.findById(customerId);
  }

  private mapRow(r: CustomerRow): CustomerEntity {
    return {
      customer_id: Number(r.customer_id),
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      document_id: r.document_id,
      shipping_address: r.shipping_address,
      city: r.city,
      vehicle_notes: r.vehicle_notes,
      crm_notes: r.crm_notes,
      created_at: new Date(r.created_at).toISOString(),
    };
  }
}
