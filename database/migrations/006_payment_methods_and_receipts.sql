-- =============================================================================
-- Migración 006: Cuentas de Pago Digitales (CRM -> Tienda) y Comprobante de Pago
-- =============================================================================

USE tienda_crm;

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS payment_accounts LONGTEXT NULL
  CHECK (payment_accounts IS NULL OR JSON_VALID(payment_accounts))
  AFTER show_bs_prices;

ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM('efectivo', 'transferencia', 'tarjeta', 'pago_movil', 'zelle', 'binance', 'otro') NOT NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_receipt_data LONGTEXT NULL AFTER notes;
