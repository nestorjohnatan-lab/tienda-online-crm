-- =============================================================================
-- Seed 002: Gama completa de productos, tiendas, Q&A y reseñas para demo
-- Idempotente: seguro de ejecutar múltiples veces sobre tienda_crm.
-- =============================================================================

USE tienda_crm;

-- 1. Tiendas adicionales del Marketplace SaaS
INSERT INTO stores (name, slug, description, city, phone, email, status, rating_average, rating_count, sales_count, response_rate_pct, is_verified)
SELECT 'FríoCar Pro', 'friocar-pro', 'Especialistas en compresores, condensadores, válvulas y gases refrigerantes automotrices.', 'Caracas', '+584142223344', 'ventas@friocarpro.com', 'active', 4.90, 28, 64, 98, 1
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE slug = 'friocar-pro');

INSERT INTO stores (name, slug, description, city, phone, email, status, rating_average, rating_count, sales_count, response_rate_pct, is_verified)
SELECT 'LED & Tuning VE', 'led-tuning-ve', 'Iluminación LED de alto rendimiento, accesorios interiores y cuidado automotriz.', 'Maracay', '+584245556677', 'contacto@ledtuningve.com', 'active', 4.80, 19, 41, 95, 1
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE slug = 'led-tuning-ve');

-- 2. Gama de 12 productos variados distribuidos entre las tiendas
INSERT INTO products (
  store_id, category_id, sku, oem_code, name, slug, product_line, brand, model_name,
  vehicle_compatibility, short_description, description, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, rating_average, rating_count,
  thumbnail_url, is_featured, is_active
)
SELECT
  COALESCE((SELECT store_id FROM stores WHERE slug = 'friocar-pro' LIMIT 1), 1),
  COALESCE((SELECT category_id FROM categories WHERE slug = 'compresores-ac' LIMIT 1), 1),
  'AC-CMP-002', '97701-2S500', 'Compresor A/C DVE16 12V Polea 6PK', 'compresor-ac-dve16-12v-6pk',
  'refrigeracion_vehicular', 'Doowon OEM', 'DVE16', 'Hyundai Tucson / Kia Sportage (2011-2016)',
  'Compresor de alto flujo con embrague magnético reforzado y aceite PAG pre-cargado.',
  'Fabricado bajo especificaciones OEM con sellos de alta presión para climas tropicales.',
  160.00, 35.00, 16.00, 250.56, 285.00, 'USD', 8, 3, 4.90, 16,
  '/media/products/compresor-ac.jpg', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'AC-CMP-002');

INSERT INTO products (
  store_id, category_id, sku, oem_code, name, slug, product_line, brand, model_name,
  vehicle_compatibility, short_description, description, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, rating_average, rating_count,
  thumbnail_url, is_featured, is_active
)
SELECT
  1,
  COALESCE((SELECT category_id FROM categories WHERE slug = 'condensadores-evaporadores' LIMIT 1), 2),
  'AC-EVP-021', '88501-0K060', 'Evaporador Aluminio A/C Delantero', 'evaporador-aluminio-ac-hilux',
  'refrigeracion_vehicular', 'Denso', 'EVP-HILUX', 'Toyota Hilux / Fortuner (2012-2020)',
  'Núcleo de aluminio soldado de alta eficiencia térmica.',
  'Probado a 300 PSI contra fugas, incluye o-rings de nitrilo.',
  62.00, 35.00, 16.00, 97.09, 115.00, 'USD', 14, 4, 4.80, 11,
  '/media/products/condensador-ac.jpg', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'AC-EVP-021');

INSERT INTO products (
  store_id, category_id, sku, oem_code, name, slug, product_line, brand, model_name,
  vehicle_compatibility, short_description, description, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, rating_average, rating_count,
  thumbnail_url, is_featured, is_active
)
SELECT
  COALESCE((SELECT store_id FROM stores WHERE slug = 'friocar-pro' LIMIT 1), 1),
  COALESCE((SELECT category_id FROM categories WHERE slug = 'gases-aceites' LIMIT 1), 3),
  'AC-OIL-PAG46', 'PAG46-250ML', 'Aceite Sintético PAG-46 con Trazador UV 250ml', 'aceite-pag-46-trazador-uv',
  'refrigeracion_vehicular', 'Four Seasons', 'PAG-46', 'Sistemas A/C R134a compresores rotativos y scroll',
  'Lubricante sintético doble tapa con detector UV integrado.',
  'Protege los sellos y rodamientos internos del compresor y facilita detección de microfugas.',
  9.00, 40.00, 16.00, 14.62, 18.00, 'USD', 32, 8, 4.85, 22,
  '/media/products/gas-r134a.jpg', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'AC-OIL-PAG46');

INSERT INTO products (
  store_id, category_id, sku, oem_code, name, slug, product_line, brand, model_name,
  vehicle_compatibility, short_description, description, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, rating_average, rating_count,
  thumbnail_url, is_featured, is_active
)
SELECT
  1,
  COALESCE((SELECT category_id FROM categories WHERE slug = 'filtros-valvulas' LIMIT 1), 4),
  'AC-VLV-108', '88515-02060', 'Válvula de Expansión Bloque Aluminio', 'valvula-expansion-bloque-aluminio',
  'refrigeracion_vehicular', 'Santech', 'EXV-108', 'Toyota Corolla / Yaris / Camry (2010-2020)',
  'Regulación precisa de sobrecalentamiento en el evaporador.',
  'Construcción CNC en aluminio anodizado con calibración de fábrica.',
  14.00, 40.00, 16.00, 22.74, 28.00, 'USD', 20, 5, 4.75, 9,
  '/media/products/condensador-ac.jpg', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'AC-VLV-108');

INSERT INTO products (
  store_id, category_id, sku, oem_code, name, slug, product_line, brand, model_name,
  vehicle_compatibility, short_description, description, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, rating_average, rating_count,
  thumbnail_url, is_featured, is_active
)
SELECT
  COALESCE((SELECT store_id FROM stores WHERE slug = 'led-tuning-ve' LIMIT 1), 1),
  COALESCE((SELECT category_id FROM categories WHERE slug = 'iluminacion-led' LIMIT 1), 5),
  'VH-LED-H4', NULL, 'Kit Bombillos LED H4 Bi-LED 18000 LM Turbofan', 'kit-bombillos-led-h4-18000lm',
  'variados_vehiculos', 'AutoPro Vision', 'H4-PRO', 'Universal socket H4 (Alta y Baja)',
  'Corte de luz perfecto anti-encandilamiento con disipador de cobre.',
  'Resistente al agua IP68, encendido instantáneo y driver Canbus integrado.',
  26.00, 45.00, 16.00, 43.73, 55.00, 'USD', 19, 5, 4.90, 27,
  '/media/products/led-h11.jpg', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'VH-LED-H4');

INSERT INTO products (
  store_id, category_id, sku, oem_code, name, slug, product_line, brand, model_name,
  vehicle_compatibility, short_description, description, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, rating_average, rating_count,
  thumbnail_url, is_featured, is_active
)
SELECT
  COALESCE((SELECT store_id FROM stores WHERE slug = 'led-tuning-ve' LIMIT 1), 1),
  COALESCE((SELECT category_id FROM categories WHERE slug = 'accesorios-cuidado' LIMIT 1), 6),
  'VH-CAR-012', NULL, 'Kit Detailing Cerámico + Microfibra 600GSM', 'kit-detailing-ceramico-microfibra',
  'variados_vehiculos', 'Nexora Care', 'CER-600', 'Todo tipo de pintura y vidrios automotrices',
  'Sellador hidrofóbico SiO2 de 6 meses de duración + 2 paños premium.',
  'Aporta brillo espejo y repelencia al agua, polvo y rayos UV.',
  18.00, 40.00, 16.00, 29.23, 36.00, 'USD', 24, 6, 4.85, 18,
  '/media/products/kit-cuidado.jpg', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'VH-CAR-012');

INSERT INTO products (
  store_id, category_id, sku, oem_code, name, slug, product_line, brand, model_name,
  vehicle_compatibility, short_description, description, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold, rating_average, rating_count,
  thumbnail_url, is_featured, is_active
)
SELECT
  1,
  COALESCE((SELECT category_id FROM categories WHERE slug = 'accesorios-cuidado' LIMIT 1), 6),
  'VH-ACC-045', NULL, 'Compresor Portátil Digital 12V 150 PSI USB-C', 'compresor-portatil-digital-150psi',
  'variados_vehiculos', 'RoadMaster', 'AIR-150', 'Vehículos, SUV, motos y bicicletas',
  'Inflador inalámbrico con manómetro digital y apagado automático.',
  'Incluye luz LED de emergencia y boquillas adaptadoras.',
  28.00, 35.00, 16.00, 43.85, 52.00, 'USD', 15, 4, 4.70, 14,
  '/media/products/kit-cuidado.jpg', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'VH-ACC-045');

-- 3. Preguntas de ejemplo (Q&A) para mostrar en tienda y responder en CRM
INSERT INTO product_questions (product_id, store_id, customer_name, question_text, answer_text, answered_at, status)
SELECT p.product_id, p.store_id, 'Luis Ramírez',
       '¿Sirve para Toyota Corolla 2017 motor 1.8?',
       'Sí amigo, aplica perfectamente para Corolla 2014 al 2019 motor 1.8. Viene listo para instalar.',
       NOW(3), 'answered'
FROM products p
WHERE p.slug = 'compresor-ac-6seu14c-12v-6pk'
  AND NOT EXISTS (SELECT 1 FROM product_questions q WHERE q.product_id = p.product_id);

INSERT INTO product_questions (product_id, store_id, customer_name, question_text, status)
SELECT p.product_id, p.store_id, 'Andrea Gómez',
       '¿Tienen disponible envío el mismo día a Valencia y dan garantía por defecto de fábrica?',
       'pending'
FROM products p
WHERE p.slug = 'kit-bombillos-led-h11-6000k'
  AND NOT EXISTS (SELECT 1 FROM product_questions q WHERE q.product_id = p.product_id);
