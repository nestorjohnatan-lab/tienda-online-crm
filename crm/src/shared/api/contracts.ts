/**
 * Contratos tipados de consumo del Panel CRM.
 * Fuente única de verdad: docs/api-contracts.md (API v1).
 */

export type UserRole = 'admin' | 'vendedor' | 'almacen' | 'cliente';
export type ProductLine = 'refrigeracion_vehicular' | 'variados_vehiculos';
export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'pagado'
  | 'despachado'
  | 'entregado'
  | 'cancelado';
export type SalesChannel = 'tienda_web' | 'crm_mostrador' | 'crm_whatsapp';
export type InventoryMovementType =
  | 'entrada'
  | 'salida_venta'
  | 'salida_manual'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'devolucion';

export interface ApiResponse<TData> {
  readonly status: 'success' | 'error';
  readonly data: TData;
  readonly message: string;
}

export interface AuthUser {
  readonly user_id: number;
  readonly full_name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly store_id?: number | null;
}

export interface StoreProfile {
  readonly store_id: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly logo_url: string | null;
  readonly banner_url: string | null;
  readonly city: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly rating_average: number;
  readonly rating_count: number;
  readonly sales_count: number;
  readonly response_rate_pct: number;
  readonly is_verified: boolean;
  readonly products_count: number;
}

export interface StoreQuestion {
  readonly question_id: number;
  readonly product_id: number;
  readonly product_name?: string;
  readonly store_id: number;
  readonly customer_name: string;
  readonly question_text: string;
  readonly answer_text: string | null;
  readonly answered_at: string | null;
  readonly status: 'pending' | 'answered' | 'hidden';
  readonly created_at: string;
}

export interface StoreReview {
  readonly review_id: number;
  readonly product_id: number;
  readonly product_name?: string;
  readonly store_id: number;
  readonly order_id: number;
  readonly reviewer_name: string;
  readonly product_rating: number;
  readonly seller_rating: number;
  readonly title: string | null;
  readonly comment: string;
  readonly seller_reply: string | null;
  readonly seller_replied_at: string | null;
  readonly created_at: string;
}

export interface OrderMessage {
  readonly message_id: number;
  readonly order_id: number;
  readonly store_id: number;
  readonly sender_role: 'buyer' | 'seller';
  readonly sender_name: string;
  readonly message_text: string;
  readonly created_at: string;
}

export interface CrmBanner {
  readonly banner_id: number;
  readonly badge_text: string | null;
  readonly title: string;
  readonly highlight_text: string | null;
  readonly subtitle: string | null;
  readonly image_url: string;
  readonly image_alt: string;
  readonly cta_label: string;
  readonly cta_url: string;
  readonly display_order: number;
  readonly is_active: boolean;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
}

export interface UpsertBannerPayload {
  readonly badge_text?: string | null;
  readonly title: string;
  readonly highlight_text?: string | null;
  readonly subtitle?: string | null;
  readonly image_url: string;
  readonly image_alt: string;
  readonly cta_label: string;
  readonly cta_url: string;
  readonly display_order: number;
  readonly is_active: boolean;
  readonly starts_at?: string | null;
  readonly ends_at?: string | null;
}

export interface InventoryMovementPayload {
  readonly product_id: number;
  readonly movement_type: Exclude<InventoryMovementType, 'salida_venta'>;
  readonly quantity: number;
  readonly unit_cost?: number;
  readonly reference_code?: string;
  readonly notes?: string;
}

export interface CrmSaleSummary {
  readonly order_id: number;
  readonly order_number: string;
  readonly customer_id: number;
  readonly customer_name: string;
  readonly sales_channel: SalesChannel;
  readonly order_status: OrderStatus;
  readonly total_amount: number;
  readonly currency: string;
  readonly created_at: string;
}
