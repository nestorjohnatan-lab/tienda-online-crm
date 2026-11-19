-- =============================================================================
-- Seed 001: Datos Iniciales de Catálogo (Refrigeración Vehicular + Variados)
--           y Carrusel de Banners Inicial (Administrable desde el CRM)
-- =============================================================================

USE tienda_crm;

-- Categorías iniciales (6 categorías principales inspiradas en el grid de IU DESING)
INSERT INTO categories (name, slug, subtitle, description, image_url, product_line, display_order, is_featured, is_active)
VALUES
  ('Compresores A/C', 'compresores-ac', 'Máximo rendimiento térmico', 'Compresores nuevos y OEM para autos, camionetas y vehículos de carga.', '/media/categories/compresores-ac.webp', 'refrigeracion_vehicular', 1, 1, 1),
  ('Condensadores y Evaporadores', 'condensadores-evaporadores', 'Intercambio térmico eficiente', 'Condensadores de flujo paralelo y evaporadores de aluminio de alta durabilidad.', '/media/categories/condensadores.webp', 'refrigeracion_vehicular', 2, 1, 1),
  ('Gases y Aceites Refrigerantes', 'gases-aceites-refrigerantes', 'R134a, R1234yf y PAG/POE', 'Gases refrigerantes certificados, aceites PAG 46/100/150 y selladores profesionales.', '/media/categories/gases-aceites.webp', 'refrigeracion_vehicular', 3, 1, 1),
  ('Filtros y Válvulas A/C', 'filtros-valvulas-ac', 'Protección del circuito', 'Filtros deshidratadores, válvulas de expansión, presostatos y kits de O-rings.', '/media/categories/filtros-valvulas.webp', 'refrigeracion_vehicular', 4, 1, 1),
  ('Iluminación LED Automotriz', 'iluminacion-led', 'Visibilidad de alto alcance', 'Bombillos LED H4/H7/H11, barras exploradoras y faros auxiliares.', '/media/categories/iluminacion-led.webp', 'variados_vehiculos', 5, 1, 1),
  ('Accesorios y Cuidado', 'accesorios-cuidado', 'Estilo y protección diaria', 'Kits de detailing, soportes, alfombras y accesorios esenciales para tu vehículo.', '/media/categories/accesorios-cuidado.webp', 'variados_vehiculos', 6, 1, 1)
ON DUPLICATE KEY UPDATE
  subtitle = VALUES(subtitle),
  display_order = VALUES(display_order),
  is_featured = VALUES(is_featured);

-- Productos de ejemplo iniciales (Refrigeración Vehicular + Variados)
INSERT INTO products (
  category_id, sku, oem_code, name, slug, product_line, brand, vehicle_compatibility,
  short_description, description, technical_specs, cost_price, sale_price, compare_at_price,
  currency, stock_quantity, min_stock_threshold, rating_average, rating_count, thumbnail_url, is_featured, is_active
)
VALUES
  (
    (SELECT category_id FROM categories WHERE slug = 'compresores-ac'),
    'AC-CMP-001', '88310-02710',
    'Compresor A/C 6SEU14C 12V Polea 6PK',
    'compresor-ac-6seu14c-12v-6pk',
    'refrigeracion_vehicular', 'Denso OEM', 'Toyota Corolla 1.8 (2014-2019)',
    'Compresor de desplazamiento variable precargado con aceite PAG 46.',
    'Compresor automotriz de alto rendimiento diseñado para máxima eficiencia de enfriamiento en climas cálidos.',
    '{"voltaje":"12V","refrigerante":"R134a","aceite":"PAG 46","polea":"6PK","garantia_meses":6}',
    165.00, 245.00, 279.00, 'USD', 12, 4, 4.90, 34, '/media/products/ac-cmp-001.webp', 1, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'condensadores-evaporadores'),
    'AC-CND-014', '97606-2H010',
    'Condensador de Flujo Paralelo Aluminio con Secador',
    'condensador-flujo-paralelo-aluminio',
    'refrigeracion_vehicular', 'Nissens', 'Hyundai Elantra / Kia Forte (2013-2018)',
    'Aluminio soldado al vacío con filtro secador integrado.',
    'Diseñado para disipación térmica rápida y alta resistencia a la corrosión.',
    '{"material":"Aluminio","refrigerante":"R134a","incluye_secador":true,"garantia_meses":6}',
    72.00, 118.00, 135.00, 'USD', 9, 3, 4.80, 21, '/media/products/ac-cnd-014.webp', 1, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'gases-aceites-refrigerantes'),
    'AC-GAS-134', 'R134A-13.6KG',
    'Cilindro Gas Refrigerante R134a 13.6 kg Alta Pureza',
    'cilindro-gas-refrigerante-r134a-13-6kg',
    'refrigeracion_vehicular', 'Chemours', 'Universal sistemas R134a',
    'Pureza certificada 99.9% para talleres y flotas automotrices.',
    'Gas refrigerante R134a libre de humedad y ácidos para recargas profesionales de A/C vehicular.',
    '{"tipo":"R134a","peso_neto_kg":13.6,"pureza":"99.9%"}',
    98.00, 145.00, NULL, 'USD', 18, 5, 4.95, 48, '/media/products/ac-gas-134.webp', 1, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'iluminacion-led'),
    'VH-LED-H11', NULL,
    'Kit Bombillos LED H11 6000K 16000 LM Canbus',
    'kit-bombillos-led-h11-6000k',
    'variados_vehiculos', 'AutoPro Vision', 'Universal socket H11 / H8 / H9',
    'Haz de luz preciso con ventilador de refrigeración activo y disipador de cobre.',
    'Iluminación blanca fría 6000K con protección IP68 contra agua y polvo.',
    '{"socket":"H11","temperatura_color":"6000K","lumenes":16000,"proteccion":"IP68"}',
    21.00, 39.99, 49.99, 'USD', 25, 6, 4.85, 63, '/media/products/vh-led-h11.webp', 1, 1
  )
ON DUPLICATE KEY UPDATE
  sale_price = VALUES(sale_price),
  is_featured = VALUES(is_featured);

-- Banners iniciales del carrusel de portada (gestionables desde el CRM)
INSERT INTO banners (badge_text, title, highlight_text, subtitle, image_url, image_alt, cta_label, cta_url, display_order, is_active)
VALUES
  (
    'REFRIGERACIÓN VEHICULAR PRO',
    'Potencia el Frío de',
    'Tu Vehículo',
    'Compresores A/C, condensadores, gases refrigerantes y repuestos de precisión con despacho rápido.',
    '/media/banners/hero-refrigeracion.webp',
    'Sistema de aire acondicionado vehicular y automóvil deportivo oscuro',
    'Explorar Catálogo',
    '/catalogo?linea=refrigeracion_vehicular',
    1,
    1
  ),
  (
    'VARIADOS Y ACCESORIOS AUTOMOTRICES',
    'Equipa y Mejora',
    'Cada Kilómetro',
    'Iluminación LED de alto rendimiento, kits de cuidado automotriz y accesorios seleccionados.',
    '/media/banners/hero-accesorios.webp',
    'Accesorios e iluminación LED para vehículos modernos',
    'Ver Accesorios',
    '/catalogo?linea=variados_vehiculos',
    2,
    1
  ),
  (
    'STOCK GARANTIZADO PARA TALLERES',
    'Suministro Directo en',
    'Gases y Repuestos A/C',
    'Precios competitivos, compatibilidad verificada y control de inventario en tiempo real.',
    '/media/banners/hero-talleres.webp',
    'Gases refrigerantes R134a y componentes de climatización automotriz',
    'Ver Categorías',
    '/categorias',
    3,
    1
  );
