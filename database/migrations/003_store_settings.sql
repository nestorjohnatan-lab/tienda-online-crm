-- =============================================================================
-- Migración 003: Configuración de Tienda Administrable desde CRM
-- =============================================================================

USE tienda_crm;

CREATE TABLE IF NOT EXISTS store_settings (
  setting_id              TINYINT UNSIGNED NOT NULL,
  free_shipping_threshold DECIMAL(12,2)    NOT NULL DEFAULT 150.00,
  free_shipping_enabled   TINYINT(1)       NOT NULL DEFAULT 1,
  currency                CHAR(3)          NOT NULL DEFAULT 'USD',
  updated_by              BIGINT UNSIGNED  NULL,
  updated_at              DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (setting_id),
  CONSTRAINT chk_store_settings_singleton CHECK (setting_id = 1),
  CONSTRAINT chk_store_settings_threshold CHECK (free_shipping_threshold >= 0),
  CONSTRAINT fk_store_settings_user
    FOREIGN KEY (updated_by) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO store_settings (setting_id, free_shipping_threshold, free_shipping_enabled, currency)
VALUES (1, 150.00, 1, 'USD')
ON DUPLICATE KEY UPDATE setting_id = VALUES(setting_id);
