-- =============================================================================
-- Migración 001: Esquema Inicial MariaDB — Tienda Online + CRM
-- Motor: MariaDB 10.11+ / 11+ / 13+ (InnoDB, utf8mb4_unicode_ci)
-- Principio: Database as a Storage, not as Business Logic
--   -> Integridad referencial, unicidad, tipos estrictos y CHECK constraints.
--   -> Cero triggers y cero stored procedures con lógica de negocio.
--   -> Borrado lógico (deleted_at) para operar con usuario PoLP (sin DELETE).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tienda_crm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tienda_crm;

-- -----------------------------------------------------------------------------
-- 1. Usuarios del sistema y autenticación stateless (JWT + Refresh Tokens)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(150)    NOT NULL,
  email          VARCHAR(190)    NOT NULL,
  password_hash  VARCHAR(255)    NOT NULL,
  role           ENUM('admin', 'vendedor', 'almacen', 'cliente') NOT NULL DEFAULT 'cliente',
  is_active      TINYINT(1)      NOT NULL DEFAULT 1,
  last_login_at  DATETIME(3)     NULL,
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at     DATETIME(3)     NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  refresh_token_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  token_hash       CHAR(64)        NOT NULL,
  user_agent       VARCHAR(255)    NULL,
  ip_address       VARCHAR(45)     NULL,
  expires_at       DATETIME(3)     NOT NULL,
  revoked_at       DATETIME(3)     NULL,
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (refresh_token_id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user_expires (user_id, expires_at),
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Categorías y Productos (Refrigeración Vehicular + Variados para Vehículos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  category_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id      BIGINT UNSIGNED NULL,
  name           VARCHAR(120)    NOT NULL,
  slug           VARCHAR(140)    NOT NULL,
  subtitle       VARCHAR(160)    NULL,
  description    TEXT            NULL,
  image_url      VARCHAR(500)    NULL,
  product_line   ENUM('refrigeracion_vehicular', 'variados_vehiculos') NOT NULL,
  display_order  INT UNSIGNED    NOT NULL DEFAULT 0,
  is_featured    TINYINT(1)      NOT NULL DEFAULT 0,
  is_active      TINYINT(1)      NOT NULL DEFAULT 1,
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at     DATETIME(3)     NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_line_active_order (product_line, is_active, display_order),
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories (category_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  product_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id           BIGINT UNSIGNED NOT NULL,
  sku                   VARCHAR(64)     NOT NULL,
  oem_code              VARCHAR(80)     NULL,
  name                  VARCHAR(180)    NOT NULL,
  slug                  VARCHAR(200)    NOT NULL,
  product_line          ENUM('refrigeracion_vehicular', 'variados_vehiculos') NOT NULL,
  brand                 VARCHAR(100)    NULL,
  vehicle_compatibility VARCHAR(255)    NULL,
  short_description     VARCHAR(300)    NULL,
  description           TEXT            NULL,
  technical_specs       LONGTEXT        NULL CHECK (technical_specs IS NULL OR JSON_VALID(technical_specs)),
  cost_price            DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  sale_price            DECIMAL(12,2)   NOT NULL,
  compare_at_price      DECIMAL(12,2)   NULL,
  currency              CHAR(3)         NOT NULL DEFAULT 'USD',
  stock_quantity        INT             NOT NULL DEFAULT 0,
  min_stock_threshold   INT UNSIGNED    NOT NULL DEFAULT 5,
  rating_average        DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  rating_count          INT UNSIGNED    NOT NULL DEFAULT 0,
  thumbnail_url         VARCHAR(500)    NULL,
  is_featured           TINYINT(1)      NOT NULL DEFAULT 0,
  is_active             TINYINT(1)      NOT NULL DEFAULT 1,
  created_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at            DATETIME(3)     NULL,
  PRIMARY KEY (product_id),
  UNIQUE KEY uq_products_sku (sku),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category_active (category_id, is_active),
  KEY idx_products_line_featured (product_line, is_featured, is_active),
  KEY idx_products_stock_alert (is_active, stock_quantity, min_stock_threshold),
  KEY idx_products_oem (oem_code),
  CONSTRAINT chk_products_prices CHECK (cost_price >= 0 AND sale_price >= 0 AND (compare_at_price IS NULL OR compare_at_price >= 0)),
  CONSTRAINT chk_products_stock CHECK (stock_quantity >= 0),
  CONSTRAINT chk_products_rating CHECK (rating_average >= 0 AND rating_average <= 5),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
  product_image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id       BIGINT UNSIGNED NOT NULL,
  image_url        VARCHAR(500)    NOT NULL,
  image_alt        VARCHAR(200)    NOT NULL,
  display_order    INT UNSIGNED    NOT NULL DEFAULT 0,
  is_primary       TINYINT(1)      NOT NULL DEFAULT 0,
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at       DATETIME(3)     NULL,
  PRIMARY KEY (product_image_id),
  KEY idx_product_images_product_order (product_id, display_order),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Carrusel de Banners de la Tienda (Controlado desde el CRM)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  banner_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  badge_text      VARCHAR(80)     NULL,
  title           VARCHAR(140)    NOT NULL,
  highlight_text  VARCHAR(80)     NULL,
  subtitle        VARCHAR(280)    NULL,
  image_url       VARCHAR(500)    NOT NULL,
  image_alt       VARCHAR(200)    NOT NULL,
  cta_label       VARCHAR(60)     NOT NULL DEFAULT 'Explorar Catálogo',
  cta_url         VARCHAR(300)    NOT NULL DEFAULT '/catalogo',
  display_order   INT UNSIGNED    NOT NULL DEFAULT 0,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  starts_at       DATETIME(3)     NULL,
  ends_at         DATETIME(3)     NULL,
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at      DATETIME(3)     NULL,
  PRIMARY KEY (banner_id),
  KEY idx_banners_store_active (is_active, deleted_at, display_order),
  KEY idx_banners_schedule (starts_at, ends_at),
  CONSTRAINT chk_banners_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT fk_banners_created_by
    FOREIGN KEY (created_by) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_banners_updated_by
    FOREIGN KEY (updated_by) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Clientes CRM
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  customer_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name        VARCHAR(150)    NOT NULL,
  email            VARCHAR(190)    NULL,
  phone            VARCHAR(40)     NOT NULL,
  document_id      VARCHAR(40)     NULL,
  shipping_address VARCHAR(300)    NULL,
  city             VARCHAR(100)    NULL,
  vehicle_notes    VARCHAR(300)    NULL,
  crm_notes        TEXT            NULL,
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at       DATETIME(3)     NULL,
  PRIMARY KEY (customer_id),
  KEY idx_customers_email (email),
  KEY idx_customers_phone (phone),
  KEY idx_customers_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Ventas y Pedidos (Tienda Online + CRM)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  order_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number      VARCHAR(40)     NOT NULL,
  customer_id       BIGINT UNSIGNED NOT NULL,
  assigned_user_id  BIGINT UNSIGNED NULL,
  sales_channel     ENUM('tienda_web', 'crm_mostrador', 'crm_whatsapp') NOT NULL DEFAULT 'tienda_web',
  order_status      ENUM('pendiente', 'confirmado', 'pagado', 'despachado', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  payment_method    ENUM('efectivo', 'transferencia', 'tarjeta', 'pago_movil', 'otro') NOT NULL,
  subtotal          DECIMAL(12,2)   NOT NULL,
  tax_amount        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  discount_amount   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  total_amount      DECIMAL(12,2)   NOT NULL,
  currency          CHAR(3)         NOT NULL DEFAULT 'USD',
  shipping_address  VARCHAR(300)    NULL,
  notes             TEXT            NULL,
  created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_status_created (order_status, created_at),
  KEY idx_orders_customer (customer_id),
  KEY idx_orders_channel_created (sales_channel, created_at),
  CONSTRAINT chk_orders_totals CHECK (subtotal >= 0 AND tax_amount >= 0 AND discount_amount >= 0 AND total_amount >= 0),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_orders_assigned_user
    FOREIGN KEY (assigned_user_id) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id              BIGINT UNSIGNED NOT NULL,
  product_id            BIGINT UNSIGNED NOT NULL,
  sku_snapshot          VARCHAR(64)     NOT NULL,
  product_name_snapshot VARCHAR(180)    NOT NULL,
  quantity              INT UNSIGNED    NOT NULL,
  unit_price            DECIMAL(12,2)   NOT NULL,
  unit_cost_snapshot    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  line_total            DECIMAL(12,2)   NOT NULL,
  created_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (order_item_id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT chk_order_items_values CHECK (quantity > 0 AND unit_price >= 0 AND unit_cost_snapshot >= 0 AND line_total >= 0),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Kardex / Movimientos de Inventario
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_movements (
  movement_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id      BIGINT UNSIGNED NOT NULL,
  order_id        BIGINT UNSIGNED NULL,
  movement_type   ENUM('entrada', 'salida_venta', 'salida_manual', 'ajuste_positivo', 'ajuste_negativo', 'devolucion') NOT NULL,
  quantity_delta  INT             NOT NULL,
  stock_before    INT             NOT NULL,
  stock_after     INT             NOT NULL,
  unit_cost       DECIMAL(12,2)   NULL,
  reference_code  VARCHAR(80)     NULL,
  notes           VARCHAR(300)    NULL,
  performed_by    BIGINT UNSIGNED NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (movement_id),
  KEY idx_inventory_movements_product_date (product_id, created_at),
  KEY idx_inventory_movements_order (order_id),
  KEY idx_inventory_movements_type_date (movement_type, created_at),
  CONSTRAINT chk_inventory_stock_bounds CHECK (stock_before >= 0 AND stock_after >= 0 AND quantity_delta <> 0),
  CONSTRAINT fk_inventory_movements_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_movements_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_movements_user
    FOREIGN KEY (performed_by) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Idempotencia y Auditoría Operativa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  idempotency_key  VARCHAR(100)    NOT NULL,
  endpoint         VARCHAR(150)    NOT NULL,
  request_hash     CHAR(64)        NOT NULL,
  response_status  SMALLINT UNSIGNED NOT NULL,
  response_body    LONGTEXT        NOT NULL CHECK (JSON_VALID(response_body)),
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at       DATETIME(3)     NOT NULL,
  PRIMARY KEY (idempotency_id),
  UNIQUE KEY uq_idempotency_key_endpoint (idempotency_key, endpoint),
  KEY idx_idempotency_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_log_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id    VARCHAR(64)     NULL,
  user_id       BIGINT UNSIGNED NULL,
  action        VARCHAR(100)    NOT NULL,
  entity_type   VARCHAR(60)     NOT NULL,
  entity_id     VARCHAR(64)     NULL,
  metadata      LONGTEXT        NULL CHECK (metadata IS NULL OR JSON_VALID(metadata)),
  ip_address    VARCHAR(45)     NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (audit_log_id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_user_date (user_id, created_at),
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
