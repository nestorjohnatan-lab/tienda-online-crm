import type { ApiResponse, AuthUser } from './contracts';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100/api/v1';

// El access token vive solo en memoria (nunca en localStorage); el refresh va en cookie HttpOnly.
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const setAccessToken = (t: string | null) => { accessToken = t; };
export const setSessionLostHandler = (fn: (() => void) | null) => { onSessionLost = fn; };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

interface SessionData { access_token: string; user: AuthUser }

async function raw<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { credentials: 'include', ...init });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0, 'NETWORK');
  }
  const json = (await res.json().catch(() => null)) as ApiResponse<T & { code?: string }> | null;
  if (!res.ok || !json || json.status !== 'success') {
    throw new ApiError(json?.message ?? `Error HTTP ${res.status}`, res.status, (json?.data as { code?: string } | undefined)?.code);
  }
  return json.data;
}

export async function refreshSession(): Promise<AuthUser | null> {
  try {
    const d = await raw<SessionData>('/auth/refresh', { method: 'POST' });
    accessToken = d.access_token;
    return d.user;
  } catch {
    accessToken = null;
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const d = await raw<SessionData>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  accessToken = d.access_token;
  return d.user;
}

export async function logout(): Promise<void> {
  await raw('/auth/logout', { method: 'POST' }).catch(() => undefined);
  accessToken = null;
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; idempotent?: boolean } = {},
): Promise<T> {
  const doCall = () =>
    raw<T>(`/crm${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(opts.idempotent ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });

  try {
    return await doCall();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const user = await refreshSession();
      if (user) return doCall();
      onSessionLost?.();
    }
    throw err;
  }
}
