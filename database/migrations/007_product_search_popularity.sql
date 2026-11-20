-- =============================================================================
-- Migración 007: Popularidad por Búsquedas y Algoritmo de Destacados
-- =============================================================================

USE tienda_crm;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER rating_count;

CREATE TABLE IF NOT EXISTS product_search_terms (
  term VARCHAR(120) NOT NULL,
  search_count INT UNSIGNED NOT NULL DEFAULT 1,
  last_searched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (term),
  KEY idx_search_terms_top (search_count DESC, last_searched_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
