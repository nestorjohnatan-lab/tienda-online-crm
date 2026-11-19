-- =============================================================================
-- Migración 004: Campos de Modelo, % Utilidad e Impuesto en Productos (CRM)
-- =============================================================================

USE tienda_crm;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS model_name VARCHAR(120) NULL AFTER brand,
  ADD COLUMN IF NOT EXISTS profit_margin_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER cost_price,
  ADD COLUMN IF NOT EXISTS tax_rate_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER profit_margin_pct;

-- Sincronizar % utilidad inicial en productos existentes que ya tienen costo > 0
UPDATE products
   SET profit_margin_pct = ROUND(((sale_price - cost_price) / cost_price) * 100, 2)
 WHERE cost_price > 0 AND profit_margin_pct = 0;
