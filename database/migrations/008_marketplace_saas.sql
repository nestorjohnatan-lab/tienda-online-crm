-- =============================================================================
-- Migración 008: Evolución a Marketplace SaaS Multi-Tienda (estilo MercadoLibre / Shopee)
--   1. Tiendas independientes (`stores`) y aislamiento `store_id` en users, products, orders
--   2. Preguntas y Respuestas públicas por producto (`product_questions`)
--   3. Mensajería privada comprador-vendedor por pedido (`order_messages`)
--   4. Reseñas verificadas de producto y atención de tienda (`product_reviews`)
-- =============================================================================

USE tienda_crm;

-- -----------------------------------------------------------------------------
-- 1. Tiendas del Marketplace (Multi-Tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
  store_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id    BIGINT UNSIGNED NULL,
  name             VARCHAR(140)    NOT NULL,
  slug             VARCHAR(160)    NOT NULL,
  description      TEXT            NULL,
  logo_url         VARCHAR(500)    NULL,
  banner_url       VARCHAR(500)    NULL,
  city             VARCHAR(100)    NULL,
  phone            VARCHAR(40)     NULL,
  email            VARCHAR(190)    NULL,
  status           ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  rating_average   DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  rating_count     INT UNSIGNED    NOT NULL DEFAULT 0,
  sales_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  response_rate_pct TINYINT UNSIGNED NOT NULL DEFAULT 100,
  is_verified      TINYINT(1)      NOT NULL DEFAULT 0,
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at       DATETIME(3)     NULL,
  PRIMARY KEY (store_id),
  UNIQUE KEY uq_stores_slug (slug),
  KEY idx_stores_status_active (status, deleted_at),
  KEY idx_stores_owner (owner_user_id),
  CONSTRAINT chk_stores_rating CHECK (rating_average >= 0 AND rating_average <= 5),
  CONSTRAINT chk_stores_response_rate CHECK (response_rate_pct <= 100),
  CONSTRAINT fk_stores_owner
    FOREIGN KEY (owner_user_id) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tienda oficial base para compatibilidad con el catálogo existente
INSERT INTO stores (store_id, name, slug, description, city, status, is_verified)
SELECT 1, 'NEXORA Oficial', 'nexora-oficial', 'Tienda principal verificada del Marketplace NEXORA.', 'Valencia', 'active', 1
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE store_id = 1);

-- -----------------------------------------------------------------------------
-- 2. Aislamiento por store_id en users, products y orders
-- -----------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER role;

ALTER TABLE users
  ADD KEY IF NOT EXISTS idx_users_store (store_id);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER product_id;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_store_active (store_id, is_active, deleted_at);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER order_id;

ALTER TABLE orders
  ADD KEY IF NOT EXISTS idx_orders_store_status (store_id, order_status, created_at);

-- -----------------------------------------------------------------------------
-- 3. Preguntas y Respuestas públicas por producto (Q&A estilo MercadoLibre)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_questions (
  question_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id     BIGINT UNSIGNED NOT NULL,
  store_id       BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NULL,
  customer_name  VARCHAR(120)    NOT NULL,
  customer_email VARCHAR(190)    NULL,
  question_text  VARCHAR(600)    NOT NULL,
  answer_text    VARCHAR(1000)   NULL,
  answered_by    BIGINT UNSIGNED NULL,
  answered_at    DATETIME(3)     NULL,
  status         ENUM('pending', 'answered', 'hidden') NOT NULL DEFAULT 'pending',
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at     DATETIME(3)     NULL,
  PRIMARY KEY (question_id),
  KEY idx_pq_product_created (product_id, status, created_at),
  KEY idx_pq_store_status (store_id, status, created_at),
  CONSTRAINT fk_pq_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pq_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pq_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pq_answered_by
    FOREIGN KEY (answered_by) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Mensajería privada comprador-vendedor por pedido (estilo Shopee / MercadoLibre)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_messages (
  message_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id       BIGINT UNSIGNED NOT NULL,
  store_id       BIGINT UNSIGNED NOT NULL,
  sender_role    ENUM('buyer', 'seller') NOT NULL,
  sender_name    VARCHAR(120)    NOT NULL,
  sender_user_id BIGINT UNSIGNED NULL,
  message_text   VARCHAR(1000)   NOT NULL,
  is_read        TINYINT(1)      NOT NULL DEFAULT 0,
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (message_id),
  KEY idx_om_order_created (order_id, created_at),
  KEY idx_om_store_read (store_id, is_read, created_at),
  CONSTRAINT fk_om_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_om_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_om_sender_user
    FOREIGN KEY (sender_user_id) REFERENCES users (user_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Reseñas verificadas de producto y atención de tienda
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reviews (
  review_id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id           BIGINT UNSIGNED NOT NULL,
  store_id             BIGINT UNSIGNED NOT NULL,
  order_id             BIGINT UNSIGNED NOT NULL,
  customer_id          BIGINT UNSIGNED NOT NULL,
  reviewer_name        VARCHAR(120)    NOT NULL,
  product_rating       TINYINT UNSIGNED NOT NULL,
  seller_rating        TINYINT UNSIGNED NOT NULL,
  title                VARCHAR(140)    NULL,
  comment              VARCHAR(1000)   NOT NULL,
  seller_reply         VARCHAR(800)    NULL,
  seller_replied_at    DATETIME(3)     NULL,
  is_verified_purchase TINYINT(1)      NOT NULL DEFAULT 1,
  created_at           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at           DATETIME(3)     NULL,
  PRIMARY KEY (review_id),
  UNIQUE KEY uq_review_order_product (order_id, product_id),
  KEY idx_pr_product_created (product_id, deleted_at, created_at),
  KEY idx_pr_store_created (store_id, deleted_at, created_at),
  CONSTRAINT chk_pr_product_rating CHECK (product_rating BETWEEN 1 AND 5),
  CONSTRAINT chk_pr_seller_rating CHECK (seller_rating BETWEEN 1 AND 5),
  CONSTRAINT fk_pr_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pr_store
    FOREIGN KEY (store_id) REFERENCES stores (store_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pr_order
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pr_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
