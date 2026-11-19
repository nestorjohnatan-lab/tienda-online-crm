import type { PoolConnection } from 'mariadb';
import { DomainRuleError } from '../../../shared/domain/app-error.js';
import type {
  InventoryMovementType,
  InventoryRepositoryPort,
  ManualMovementType,
  RecordMovementInput,
} from '../domain/inventory.repository.js';

export function computeMovementDelta(type: ManualMovementType, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new DomainRuleError('La cantidad del movimiento debe ser un entero mayor que cero');
  }
  if (type === 'salida_manual' || type === 'ajuste_negativo') {
    return -quantity;
  }
  return quantity;
}

export class InventoryService {
  constructor(private readonly inventoryRepo: InventoryRepositoryPort) {}

  listLowStockAlerts() {
    return this.inventoryRepo.listLowStockAlerts();
  }

  listMovements(params: {
    product_id?: number | undefined;
    movement_type?: InventoryMovementType | undefined;
    page: number;
    page_size: number;
  }) {
    return this.inventoryRepo.listMovements(params);
  }

  recordManualMovementInTx(conn: PoolConnection, input: RecordMovementInput) {
    const delta = computeMovementDelta(input.movement_type, input.quantity);
    return this.inventoryRepo.recordManualMovementInTx(conn, input, delta);
  }
}
