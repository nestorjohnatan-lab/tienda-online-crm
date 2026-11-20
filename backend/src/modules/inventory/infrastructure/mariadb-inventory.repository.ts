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
      `SELECT id AS product_id, codigo AS sku, codigo AS oem_code, nombre AS name,
              stock_actual AS stock_quantity, stock_minimo AS min_stock_threshold
         FROM productos
        WHERE estado = 'activo'
          AND stock_actual <= stock_minimo
        ORDER BY (stock_minimo - stock_actual) DESC, stock_actual ASC`,
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
      conditions.push('m.producto_id = ?');
      sqlParams.push(params.product_id);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total FROM inventario_movimientos m WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT m.id AS movement_id, m.producto_id AS product_id, p.codigo AS sku,
              p.nombre AS product_name, NULL AS order_id,
              IF(m.tipo = 'cargo', 'entrada', 'salida_manual') AS movement_type,
              IF(m.tipo = 'cargo', m.cantidad, -m.cantidad) AS quantity_delta,
              p.stock_actual AS stock_before,
              p.stock_actual AS stock_after,
              p.costo_usd AS unit_cost,
              m.motivo AS reference_code,
              m.motivo AS notes,
              m.usuario_id AS performed_by,
              m.created_at
         FROM inventario_movimientos m
         INNER JOIN productos p ON p.id = m.producto_id
        WHERE ${whereClause}
        ORDER BY m.id DESC
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
      `SELECT id, codigo, nombre, stock_actual, costo_usd
         FROM productos
        WHERE id = ?
        LIMIT 1 FOR UPDATE`,
      [input.product_id],
    )) as { id: number; codigo: string; nombre: string; stock_actual: number; costo_usd: number }[];

    const product = productRows[0];
    if (!product) {
      throw new NotFoundError(`Producto ${input.product_id} no encontrado`);
    }

    const stockBefore = Number(product.stock_actual);
    const stockAfter = stockBefore + quantityDelta;
    if (stockAfter < 0) {
      throw new ConflictError(
        `Stock insuficiente para ${product.codigo}: actual ${stockBefore}, ajuste solicitado ${quantityDelta}`,
        'INSUFFICIENT_STOCK',
      );
    }

    await conn.query(`UPDATE productos SET stock_actual = ? WHERE id = ?`, [
      stockAfter,
      input.product_id,
    ]);

    await conn.query(
      `UPDATE productos_depositos SET stock_actual = ? WHERE producto_id = ? AND deposito_id = 1`,
      [stockAfter, input.product_id],
    );

    const tipo = quantityDelta >= 0 ? 'cargo' : 'descargo';
    const absQty = Math.abs(quantityDelta);

    const res = (await conn.query(
      `INSERT INTO inventario_movimientos
        (producto_id, deposito_id, tipo, cantidad, motivo, usuario_id)
       VALUES (?, 1, ?, ?, ?, ?)`,
      [
        input.product_id,
        tipo,
        absQty,
        input.notes || input.reference_code || 'Ajuste manual',
        input.performed_by || 1,
      ],
    )) as { insertId: number };

    return {
      movement_id: Number(res.insertId),
      product_id: Number(product.id),
      sku: product.codigo,
      product_name: product.nombre,
      order_id: null,
      movement_type: input.movement_type,
      quantity_delta: quantityDelta,
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_cost: Number(product.costo_usd),
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
