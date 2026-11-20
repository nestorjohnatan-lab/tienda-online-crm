/**
 * Contratos tipados de consumo de la Tienda Online.
 * Fuente única de verdad: docs/api-contracts.md (API v1).
 */

export type ProductLine = 'refrigeracion_vehicular' | 'variados_vehiculos';

export interface ApiResponse<TData> {
  readonly status: 'success' | 'error';
  readonly data: TData;
  readonly message: string;
}

export interface StoreBanner {
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
}

export interface StoreCategory {
  readonly category_id: number;
  readonly name: string;
  readonly slug: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly image_url: string | null;
  readonly product_line: ProductLine;
  readonly display_order: number;
  readonly active_products_count: number;
}

export interface StoreProductSummary {
  readonly product_id: number;
  readonly store_id?: number;
  readonly store_name?: string;
  readonly store_slug?: string;
  readonly sku: string;
  readonly oem_code: string | null;
  readonly name: string;
  readonly slug: string;
  readonly category_id: number;
  readonly category_name: string;
  readonly product_line: ProductLine;
  readonly brand: string | null;
  readonly vehicle_compatibility: string | null;
  readonly price: number;
  readonly compare_at_price: number | null;
  readonly currency: string;
  readonly stock_quantity: number;
  readonly in_stock: boolean;
  readonly rating_average: number;
  readonly rating_count: number;
  readonly thumbnail_url: string | null;
  readonly is_featured: boolean;
  readonly sold_count?: number;
  readonly search_count?: number;
  readonly popularity_score?: number;
}

export interface TrendingSearchTerm {
  readonly term: string;
  readonly search_count: number;
}

export interface PaymentAccountsConfig {
  readonly pago_movil: {
    readonly enabled: boolean;
    readonly bank: string;
    readonly phone: string;
    readonly document_id: string;
    readonly holder_name: string;
  };
  readonly transferencia: {
    readonly enabled: boolean;
    readonly bank: string;
    readonly account_number: string;
    readonly account_type: string;
    readonly document_id: string;
    readonly holder_name: string;
  };
  readonly zelle: {
    readonly enabled: boolean;
    readonly email: string;
    readonly holder_name: string;
  };
  readonly binance: {
    readonly enabled: boolean;
    readonly pay_id: string;
    readonly email: string;
    readonly holder_name: string;
  };
}

export interface StoreSettings {
  readonly free_shipping_threshold: number;
  readonly free_shipping_enabled: boolean;
  readonly currency: string;
  readonly bcv_rate: number;
  readonly show_bs_prices: boolean;
  readonly payment_accounts: PaymentAccountsConfig;
}

export interface StoreUser {
  readonly user_id: number;
  readonly full_name: string;
  readonly email: string;
  readonly role: string;
  readonly phone?: string | null;
  readonly shipping_address?: string | null;
  readonly city?: string | null;
  readonly document_id?: string | null;
}

export interface RegisterCustomerRequest {
  readonly full_name: string;
  readonly email: string;
  readonly password: string;
  readonly phone: string;
  readonly document_id?: string | null;
  readonly shipping_address: string;
  readonly city: string;
}

export interface MarketplaceStore {
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

export interface ProductDetail extends StoreProductSummary {
  readonly short_description: string | null;
  readonly description: string | null;
  readonly technical_specs: Record<string, unknown> | null;
  readonly store: {
    readonly store_id: number;
    readonly name: string;
    readonly slug: string;
    readonly city: string | null;
    readonly rating_average: number;
    readonly rating_count: number;
    readonly sales_count: number;
    readonly response_rate_pct: number;
    readonly is_verified: boolean;
  };
  readonly images: readonly {
    readonly product_image_id: number;
    readonly image_url: string;
    readonly image_alt: string;
    readonly display_order: number;
    readonly is_primary: boolean;
  }[];
}

export interface ProductQuestion {
  readonly question_id: number;
  readonly product_id: number;
  readonly store_id: number;
  readonly customer_name: string;
  readonly question_text: string;
  readonly answer_text: string | null;
  readonly answered_at: string | null;
  readonly status: 'pending' | 'answered' | 'hidden';
  readonly created_at: string;
}

export interface ProductReview {
  readonly review_id: number;
  readonly product_id: number;
  readonly store_id: number;
  readonly order_id: number;
  readonly reviewer_name: string;
  readonly product_rating: number;
  readonly seller_rating: number;
  readonly title: string | null;
  readonly comment: string;
  readonly seller_reply: string | null;
  readonly seller_replied_at: string | null;
  readonly is_verified_purchase: boolean;
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

export interface CreateStoreOrderRequest {
  readonly customer: {
    readonly full_name: string;
    readonly email: string;
    readonly phone: string;
    readonly document_id?: string;
    readonly shipping_address: string;
    readonly city: string;
  };
  readonly payment_method: 'efectivo' | 'transferencia' | 'tarjeta' | 'pago_movil' | 'zelle' | 'binance' | 'otro';
  readonly notes?: string;
  readonly payment_receipt_data?: string;
  readonly items: readonly {
    readonly product_id: number;
    readonly quantity: number;
  }[];
}

export interface CreateStoreOrderResponse {
  readonly order_id: number;
  readonly order_number: string;
  readonly order_status: string;
  readonly subtotal: number;
  readonly tax_amount: number;
  readonly total_amount: number;
  readonly currency: string;
  readonly created_at: string;
}
