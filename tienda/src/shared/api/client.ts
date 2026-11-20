import { useEffect, useState } from 'react';
import type {
  ApiResponse,
  CreateStoreOrderRequest,
  CreateStoreOrderResponse,
  MarketplaceStore,
  OrderMessage,
  ProductDetail,
  ProductQuestion,
  ProductReview,
  RegisterCustomerRequest,
  StoreBanner,
  StoreCategory,
  StoreProductSummary,
  StoreSettings,
  StoreUser,
  TrendingSearchTerm,
} from './contracts';
import { mockBanners, mockCategories, mockProducts, mockTrendingSearches } from './mock-data';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100/api/v1';
export const API_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, '');
export const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '/media/products/compresor-ac.jpg';
  if (url.startsWith('/media/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
};
const TIMEOUT_MS = 4000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...init,
      signal: controller.signal,
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || `HTTP ${res.status}`);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

export interface AuthSessionResponse {
  readonly access_token: string;
  readonly expires_in_seconds: number;
  readonly user: StoreUser;
}

export const authApi = {
  register: (payload: RegisterCustomerRequest) =>
    request<AuthSessionResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  login: (email: string, password: string) =>
    request<AuthSessionResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  refresh: () => request<AuthSessionResponse>('/auth/refresh', { method: 'POST' }),
  logout: () => request<{ logged_out: boolean }>('/auth/logout', { method: 'POST' }),
};

export interface Paginated<T> {
  readonly items: readonly T[];
}

export const storeApi = {
  banners: () => request<Paginated<StoreBanner>>('/store/banners'),
  categories: () => request<Paginated<StoreCategory>>('/store/categories'),
  products: (qs: string) => request<Paginated<StoreProductSummary>>(`/store/products${qs}`),
  trendingSearches: (limit = 6) =>
    request<{ items: readonly TrendingSearchTerm[] }>(`/store/trending-searches?limit=${limit}`),
  settings: () => request<StoreSettings>('/store/settings'),
  createOrder: (payload: CreateStoreOrderRequest, idempotencyKey: string) =>
    request<CreateStoreOrderResponse>('/store/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    }),
  productBySlug: (slug: string) => request<ProductDetail>(`/store/products/${encodeURIComponent(slug)}`),
  stores: () => request<readonly MarketplaceStore[]>('/store/stores'),
  storeBySlug: (slug: string) => request<MarketplaceStore>(`/store/stores/${encodeURIComponent(slug)}`),
  registerStore: (payload: {
    owner_name: string;
    owner_email: string;
    password: string;
    store_name: string;
    city: string;
    phone: string;
    description?: string;
  }) =>
    request<{ store: MarketplaceStore; user: StoreUser; access_token: string }>('/store/stores/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  productQuestions: (productId: number) =>
    request<readonly ProductQuestion[]>(`/store/products/${productId}/questions`),
  askQuestion: (productId: number, questionText: string, accessToken: string) =>
    request<ProductQuestion>(`/store/products/${productId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ question_text: questionText }),
    }),
  productReviews: (productId: number) =>
    request<readonly ProductReview[]>(`/store/products/${productId}/reviews`),
  createReview: (
    productId: number,
    payload: {
      order_number: string;
      product_rating: number;
      seller_rating: number;
      title?: string;
      comment: string;
    },
    accessToken: string,
  ) =>
    request<ProductReview>(`/store/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }),
  myOrders: (accessToken: string) =>
    request<
      readonly {
        order_id: number;
        order_number: string;
        order_status: string;
        total_amount: number;
        currency: string;
        store_name: string;
        created_at: string;
        items: readonly { product_id: number; product_name: string; quantity: number }[];
      }[]
    >('/store/my/orders', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  orderMessages: (orderNumber: string, contact: string) =>
    request<{ order_id: number; store_id: number; customer_name: string; messages: readonly OrderMessage[] }>(
      `/store/orders/${encodeURIComponent(orderNumber)}/messages?contact=${encodeURIComponent(contact)}`,
    ),
  sendOrderMessage: (orderNumber: string, payload: { contact: string; message_text: string }) =>
    request<OrderMessage>(`/store/orders/${encodeURIComponent(orderNumber)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};

export interface RemoteState<T> {
  readonly data: T;
  readonly loading: boolean;
  readonly isFallback: boolean;
}

/** Estado del servidor con Graceful Degradation: si la API falla, usa contrato mock. */
export function useRemote<T>(load: () => Promise<T>, fallback: T, deps: readonly unknown[]): RemoteState<T> {
  const [state, setState] = useState<RemoteState<T>>({ data: fallback, loading: true, isFallback: false });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    load()
      .then((data) => !cancelled && setState({ data, loading: false, isFallback: false }))
      .catch(() => !cancelled && setState({ data: fallback, loading: false, isFallback: true }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export const useBanners = () =>
  useRemote(() => storeApi.banners().then((d) => d.items), mockBanners, []);

export const useCategories = () =>
  useRemote(() => storeApi.categories().then((d) => d.items), mockCategories, []);

const DEFAULT_SETTINGS: StoreSettings = {
  free_shipping_threshold: 150,
  free_shipping_enabled: true,
  currency: 'USD',
  bcv_rate: 50,
  show_bs_prices: true,
  payment_accounts: {
    pago_movil: {
      enabled: true,
      bank: 'Banesco (0134)',
      phone: '0414-5550199',
      document_id: 'J-50123456-0',
      holder_name: 'NEXORA C.A.',
    },
    transferencia: {
      enabled: true,
      bank: 'Banesco',
      account_number: '0134-0946-33-0001234567',
      account_type: 'Corriente',
      document_id: 'J-50123456-0',
      holder_name: 'NEXORA C.A.',
    },
    zelle: {
      enabled: true,
      email: 'pagos@nexora-demo.com',
      holder_name: 'NEXORA LLC',
    },
    binance: {
      enabled: true,
      pay_id: '518904321',
      email: 'binance@nexora-demo.com',
      holder_name: 'Nexora_Pay',
    },
  },
};

export const useStoreSettings = () =>
  useRemote(() => storeApi.settings(), DEFAULT_SETTINGS, []);

export const useProducts = (qs: string) =>
  useRemote(() => storeApi.products(qs).then((d) => d.items), mockProducts, [qs]);

export const useTrendingSearches = (limit = 6) =>
  useRemote(() => storeApi.trendingSearches(limit).then((d) => d.items), mockTrendingSearches, [limit]);
