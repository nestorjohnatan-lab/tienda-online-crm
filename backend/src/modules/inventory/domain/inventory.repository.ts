import type { PoolConnection } from 'mariadb';
import type { PaginatedData } from '../../../shared/contracts/api-response.js';

export type InventoryMovementType =
  | 'entrada'
  | 'salida_venta'
  | 'salida_manual'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'devolucion';

export type ManualMovementType = Exclude<InventoryMovementType, 'salida_venta'>;

export interface LowStockAlertItem {
  readonly product_id: number;
  readonly sku: string;
  readonly oem_code: string | null;
  readonly name: string;
  readonly stock_quantity: number;
  readonly min_stock_threshold: number;
  readonly deficit: number;
}

export interface InventoryMovementRecord {
  readonly movement_id: number;
  readonly product_id: number;
  readonly sku: string;
  readonly product_name: string;
  readonly order_id: number | null;
  readonly movement_type: InventoryMovementType;
  readonly quantity_delta: number;
  readonly stock_before: number;
  readonly stock_after: number;
  readonly unit_cost: number | null;
  readonly reference_code: string | null;
  readonly notes: string | null;
  readonly performed_by: number | null;
  readonly created_at: string;
}

export interface RecordMovementInput {
  readonly product_id: number;
  readonly movement_type: ManualMovementType;
  readonly quantity: number;
  readonly unit_cost: number | null;
  readonly reference_code: string | null;
  readonly notes: string | null;
  readonly performed_by: number;
}

export interface InventoryRepositoryPort {
  listLowStockAlerts(): Promise<readonly LowStockAlertItem[]>;
  listMovements(params: {
    product_id?: number | undefined;
    movement_type?: InventoryMovementType | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<InventoryMovementRecord>>;
  recordManualMovementInTx(
    conn: PoolConnection,
    input: RecordMovementInput,
    quantityDelta: number,
  ): Promise<InventoryMovementRecord>;
}
