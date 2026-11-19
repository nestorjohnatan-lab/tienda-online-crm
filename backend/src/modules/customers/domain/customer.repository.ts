import type { PaginatedData } from '../../../shared/contracts/api-response.js';

export interface CustomerEntity {
  readonly customer_id: number;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string;
  readonly document_id: string | null;
  readonly shipping_address: string | null;
  readonly city: string | null;
  readonly vehicle_notes: string | null;
  readonly crm_notes: string | null;
  readonly created_at: string;
}

export interface UpsertCustomerInput {
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string;
  readonly document_id: string | null;
  readonly shipping_address: string | null;
  readonly city: string | null;
  readonly vehicle_notes: string | null;
  readonly crm_notes: string | null;
}

export interface CustomerRepositoryPort {
  list(params: { q?: string | undefined; page: number; page_size: number }): Promise<PaginatedData<CustomerEntity>>;
  findById(customerId: number): Promise<CustomerEntity | null>;
  create(input: UpsertCustomerInput): Promise<CustomerEntity>;
  update(customerId: number, input: UpsertCustomerInput): Promise<CustomerEntity | null>;
}
