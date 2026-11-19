import { NotFoundError } from '../../../shared/domain/app-error.js';
import type {
  CustomerRepositoryPort,
  UpsertCustomerInput,
} from '../domain/customer.repository.js';

export class CustomerService {
  constructor(private readonly customerRepo: CustomerRepositoryPort) {}

  list(params: { q?: string | undefined; page: number; page_size: number }) {
    return this.customerRepo.list(params);
  }

  async getById(customerId: number) {
    const found = await this.customerRepo.findById(customerId);
    if (!found) throw new NotFoundError(`Cliente ${customerId} no encontrado`);
    return found;
  }

  create(input: UpsertCustomerInput) {
    return this.customerRepo.create(input);
  }

  async update(customerId: number, input: UpsertCustomerInput) {
    const updated = await this.customerRepo.update(customerId, input);
    if (!updated) throw new NotFoundError(`Cliente ${customerId} no encontrado`);
    return updated;
  }
}
