import type { PoolConnection } from 'mariadb';
import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { DomainRuleError } from '../../../shared/domain/app-error.js';

export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'pagado'
  | 'despachado'
  | 'entregado'
  | 'cancelado';

export type SalesChannel = 'tienda_web' | 'crm_mostrador' | 'crm_whatsapp';
export type PaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'tarjeta'
  | 'pago_movil'
  | 'zelle'
  | 'binance'
  | 'otro';

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pendiente: ['confirmado', 'pagado', 'cancelado'],
  confirmado: ['pagado', 'despachado', 'cancelado'],
  pagado: ['despachado', 'entregado', 'cancelado'],
  despachado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export function assertValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) {
    throw new DomainRuleError(`La orden ya se encuentra en estado '${to}'`);
  }
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new DomainRuleError(
      `Transición de estado inválida: no se puede pasar de '${from}' a '${to}'`,
    );
  }
}

export interface OrderItemInput {
  readonly product_id: number;
  readonly quantity: number;
}

export interface CreateOrderInTxInput {
  readonly customer_id?: number | undefined;
  readonly customer?: {
    readonly full_name: string;
    readonly email: string | null;
    readonly phone: string;
    readonly document_id: string | null;
    readonly shipping_address: string | null;
    readonly city: string | null;
  } | undefined;
  readonly sales_channel: SalesChannel;
  readonly payment_method: PaymentMethod;
  readonly discount_amount: number;
  readonly shipping_address: string | null;
  readonly notes: string | null;
  readonly payment_receipt_data?: string | null | undefined;
  readonly assigned_user_id: number | null;
  readonly items: readonly OrderItemInput[];
}

export interface CreatedOrderSummary {
  readonly order_id: number;
  readonly order_number: string;
  readonly order_status: OrderStatus;
  readonly subtotal: number;
  readonly tax_amount: number;
  readonly discount_amount: number;
  readonly total_amount: number;
  readonly currency: string;
  readonly created_at: string;
}

export interface CrmSaleListItem {
  readonly order_id: number;
  readonly order_number: string;
  readonly customer_id: number;
  readonly customer_name: string;
  readonly sales_channel: SalesChannel;
  readonly order_status: OrderStatus;
  readonly payment_method: PaymentMethod;
  readonly total_amount: number;
  readonly currency: string;
  readonly created_at: string;
}

export interface CrmSaleDetail extends CrmSaleListItem {
  readonly subtotal: number;
  readonly tax_amount: number;
  readonly discount_amount: number;
  readonly shipping_address: string | null;
  readonly notes: string | null;
  readonly payment_receipt_data: string | null;
  readonly items: readonly {
    readonly order_item_id: number;
    readonly product_id: number;
    readonly sku_snapshot: string;
    readonly product_name_snapshot: string;
    readonly quantity: number;
    readonly unit_price: number;
    readonly line_total: number;
  }[];
}

export interface DashboardSummary {
  readonly total_sales_amount: number;
  readonly orders_count: number;
  readonly pending_orders_count: number;
  readonly low_stock_products_count: number;
  readonly active_banners_count: number;
  readonly recent_orders: readonly CrmSaleListItem[];
}

export interface SaleRepositoryPort {
  createOrderInTx(conn: PoolConnection, input: CreateOrderInTxInput): Promise<CreatedOrderSummary>;
  listSales(params: {
    order_status?: OrderStatus | undefined;
    sales_channel?: SalesChannel | undefined;
    q?: string | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CrmSaleListItem>>;
  findSaleById(orderId: number): Promise<CrmSaleDetail | null>;
  updateOrderStatus(orderId: number, nextStatus: OrderStatus, actorUserId: number): Promise<CrmSaleDetail>;
  getDashboardSummary(): Promise<DashboardSummary>;
}
