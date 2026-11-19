import { useEffect, useState } from 'react';
import type {
  ApiResponse,
  CreateStoreOrderRequest,
  CreateStoreOrderResponse,
  RegisterCustomerRequest,
  StoreBanner,
  StoreCategory,
  StoreProductSummary,
  StoreSettings,
  StoreUser,
} from './contracts';
import { mockBanners, mockCategories, mockProducts } from './mock-data';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100/api/v1';
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
  settings: () => request<StoreSettings>('/store/settings'),
  createOrder: (payload: CreateStoreOrderRequest, idempotencyKey: string) =>
    request<CreateStoreOrderResponse>('/store/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
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
      holder_name: 'AutoFrío PRO C.A.',
    },
    transferencia: {
      enabled: true,
      bank: 'Banesco',
      account_number: '0134-0946-33-0001234567',
      account_type: 'Corriente',
      document_id: 'J-50123456-0',
      holder_name: 'AutoFrío PRO C.A.',
    },
    zelle: {
      enabled: true,
      email: 'pagos@autofriopro-demo.com',
      holder_name: 'AutoFrio PRO LLC',
    },
    binance: {
      enabled: true,
      pay_id: '518904321',
      email: 'binance@autofriopro-demo.com',
      holder_name: 'AutoFrioPro_Pay',
    },
  },
};

export const useStoreSettings = () =>
  useRemote(() => storeApi.settings(), DEFAULT_SETTINGS, []);

export const useProducts = (qs: string) =>
  useRemote(() => storeApi.products(qs).then((d) => d.items), mockProducts, [qs]);
