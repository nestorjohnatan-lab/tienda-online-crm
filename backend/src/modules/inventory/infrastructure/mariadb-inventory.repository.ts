import type { PoolConnection } from 'mariadb';
import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/app-error.js';
import { dbPool } from '../../../shared/infrastructure/database/pool.js';
import type {
  InventoryMovementRecord,
  InventoryMovementType,
  InventoryRepositoryPort,
  LowStockAlertItem,
  RecordMovementInput,
} from '../domain/inventory.repository.js';

interface MovementRow {
  movement_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  order_id: number | null;
  movement_type: InventoryMovementType;
  quantity_delta: number;
  stock_before: number;
  stock_after: number;
  unit_cost: number | null;
  reference_code: string | null;
  notes: string | null;
  performed_by: number | null;
  created_at: Date;
}

export class MariaDbInventoryRepository implements InventoryRepositoryPort {
  async listLowStockAlerts(): Promise<readonly LowStockAlertItem[]> {
    const rows = (await dbPool.query(
      `SELECT product_id, sku, oem_code, name, stock_quantity, min_stock_threshold
         FROM products
        WHERE deleted_at IS NULL
          AND is_active = 1
          AND stock_quantity <= min_stock_threshold
        ORDER BY (min_stock_threshold - stock_quantity) DESC, stock_quantity ASC`,
    )) as {
      product_id: number;
      sku: string;
      oem_code: string | null;
      name: string;
      stock_quantity: number;
      min_stock_threshold: number;
    }[];

    return rows.map((r) => {
      const stock = Number(r.stock_quantity);
      const min = Number(r.min_stock_threshold);
      return {
        product_id: Number(r.product_id),
        sku: r.sku,
        oem_code: r.oem_code,
        name: r.name,
        stock_quantity: stock,
        min_stock_threshold: min,
        deficit: Math.max(0, min - stock),
      };
    });
  }

  async listMovements(params: {
    product_id?: number | undefined;
    movement_type?: InventoryMovementType | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<InventoryMovementRecord>> {
    const conditions: string[] = ['1 = 1'];
    const sqlParams: unknown[] = [];

    if (params.product_id !== undefined) {
      conditions.push('m.product_id = ?');
      sqlParams.push(params.product_id);
    }
    if (params.movement_type !== undefined) {
      conditions.push('m.movement_type = ?');
      sqlParams.push(params.movement_type);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total FROM inventory_movements m WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT m.movement_id, m.product_id, p.sku, p.name AS product_name,
              m.order_id, m.movement_type, m.quantity_delta, m.stock_before, m.stock_after,
              m.unit_cost, m.reference_code, m.notes, m.performed_by, m.created_at
         FROM inventory_movements m
         INNER JOIN products p ON p.product_id = m.product_id
        WHERE ${whereClause}
        ORDER BY m.created_at DESC, m.movement_id DESC
        LIMIT ? OFFSET ?`,
      [...sqlParams, params.page_size, offset],
    )) as MovementRow[];

    return {
      items: rows.map((r) => this.mapMovement(r)),
      pagination: {
        page: params.page,
        page_size: params.page_size,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / params.page_size)),
      },
    };
  }

  async recordManualMovementInTx(
    conn: PoolConnection,
    input: RecordMovementInput,
    quantityDelta: number,
  ): Promise<InventoryMovementRecord> {
    const productRows = (await conn.query(
      `SELECT product_id, sku, name, stock_quantity
         FROM products
        WHERE product_id = ? AND deleted_at IS NULL
        LIMIT 1 FOR UPDATE`,
      [input.product_id],
    )) as { product_id: number; sku: string; name: string; stock_quantity: number }[];

    const product = productRows[0];
    if (!product) {
      throw new NotFoundError(`Producto ${input.product_id} no encontrado`);
    }

    const stockBefore = Number(product.stock_quantity);
    const stockAfter = stockBefore + quantityDelta;
    if (stockAfter < 0) {
      throw new ConflictError(
        `Stock insuficiente para ${product.sku}: actual ${stockBefore}, ajuste solicitado ${quantityDelta}`,
        'INSUFFICIENT_STOCK',
      );
    }

    await conn.query(`UPDATE products SET stock_quantity = ? WHERE product_id = ?`, [
      stockAfter,
      input.product_id,
    ]);

    const res = (await conn.query(
      `INSERT INTO inventory_movements
        (product_id, movement_type, quantity_delta, stock_before, stock_after,
         unit_cost, reference_code, notes, performed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.product_id,
        input.movement_type,
        quantityDelta,
        stockBefore,
        stockAfter,
        input.unit_cost,
        input.reference_code,
        input.notes,
        input.performed_by,
      ],
    )) as { insertId: number };

    return {
      movement_id: Number(res.insertId),
      product_id: Number(product.product_id),
      sku: product.sku,
      product_name: product.name,
      order_id: null,
      movement_type: input.movement_type,
      quantity_delta: quantityDelta,
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_cost: input.unit_cost,
      reference_code: input.reference_code,
      notes: input.notes,
      performed_by: input.performed_by,
      created_at: new Date().toISOString(),
    };
  }

  private mapMovement(r: MovementRow): InventoryMovementRecord {
    return {
      movement_id: Number(r.movement_id),
      product_id: Number(r.product_id),
      sku: r.sku,
      product_name: r.product_name,
      order_id: r.order_id === null ? null : Number(r.order_id),
      movement_type: r.movement_type,
      quantity_delta: Number(r.quantity_delta),
      stock_before: Number(r.stock_before),
      stock_after: Number(r.stock_after),
      unit_cost: r.unit_cost === null ? null : Number(r.unit_cost),
      reference_code: r.reference_code,
      notes: r.notes,
      performed_by: r.performed_by === null ? null : Number(r.performed_by),
      created_at: new Date(r.created_at).toISOString(),
    };
  }
}
