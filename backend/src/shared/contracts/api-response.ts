/**
 * Contrato de Datos Inmutable (API Contract First — Sección 7.2)
 * Toda respuesta HTTP de la API debe utilizar este sobre estándar.
 */

export type ApiStatus = 'success' | 'error';

export interface ApiResponse<TData = unknown> {
  readonly status: ApiStatus;
  readonly data: TData;
  readonly message: string;
}

export interface ApiErrorDetail {
  readonly field: string;
  readonly issue: string;
}

export interface ApiErrorData {
  readonly code: string;
  readonly details?: readonly ApiErrorDetail[];
}

export interface PaginationMeta {
  readonly page: number;
  readonly page_size: number;
  readonly total_items: number;
  readonly total_pages: number;
}

export interface PaginatedData<TItem> {
  readonly items: readonly TItem[];
  readonly pagination: PaginationMeta;
}

export function okResponse<TData>(data: TData, message: string): ApiResponse<TData> {
  return {
    status: 'success',
    data,
    message,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: readonly ApiErrorDetail[],
): ApiResponse<ApiErrorData> {
  return {
    status: 'error',
    data: details ? { code, details } : { code },
    message,
  };
}
