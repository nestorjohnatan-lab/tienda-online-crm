-- =============================================================================
-- Migración 005: Tasa BCV y visualización de precios en Bs (USD + Bs)
-- =============================================================================

USE tienda_crm;

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS bcv_rate DECIMAL(12,4) NOT NULL DEFAULT 50.0000 AFTER currency,
  ADD COLUMN IF NOT EXISTS show_bs_prices TINYINT(1) NOT NULL DEFAULT 1 AFTER bcv_rate;
