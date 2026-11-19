import type { PoolConnection } from 'mariadb';
import { NotFoundError } from '../../../shared/domain/app-error.js';
import type {
  CreateOrderInTxInput,
  OrderStatus,
  SaleRepositoryPort,
  SalesChannel,
} from '../domain/sale.repository.js';

export class SaleService {
  constructor(private readonly saleRepo: SaleRepositoryPort) {}

  createOrderInTx(conn: PoolConnection, input: CreateOrderInTxInput) {
    return this.saleRepo.createOrderInTx(conn, input);
  }

  listSales(params: {
    order_status?: OrderStatus | undefined;
    sales_channel?: SalesChannel | undefined;
    q?: string | undefined;
    page: number;
    page_size: number;
  }) {
    return this.saleRepo.listSales(params);
  }

  async getSaleById(orderId: number) {
    const found = await this.saleRepo.findSaleById(orderId);
    if (!found) throw new NotFoundError(`Venta ${orderId} no encontrada`);
    return found;
  }

  updateOrderStatus(orderId: number, nextStatus: OrderStatus, actorUserId: number) {
    return this.saleRepo.updateOrderStatus(orderId, nextStatus, actorUserId);
  }

  getDashboardSummary() {
    return this.saleRepo.getDashboardSummary();
  }
}
