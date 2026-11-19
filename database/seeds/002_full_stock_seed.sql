-- =============================================================================
-- Seed 002: Stock Completo de Tienda (Refrigeración Vehicular + Variados)
-- Agrega 14 productos adicionales cubriendo las 6 categorías principales.
-- =============================================================================

USE tienda_crm;

INSERT INTO products (
  category_id, sku, oem_code, name, slug, product_line, brand, model_name, vehicle_compatibility,
  short_description, description, technical_specs, cost_price, profit_margin_pct, tax_rate_pct,
  sale_price, compare_at_price, currency, stock_quantity, min_stock_threshold,
  rating_average, rating_count, thumbnail_url, is_featured, is_active
)
VALUES
  -- 1. Compresores A/C
  (
    (SELECT category_id FROM categories WHERE slug = 'compresores-ac'),
    'AC-CMP-002', '97701-2S500',
    'Compresor A/C DVE16 12V Polea 6PK',
    'compresor-ac-dve16-12v-6pk',
    'refrigeracion_vehicular', 'Doowon OEM', 'DVE16 / Tucson-Sportage', 'Hyundai Tucson / Kia Sportage 2.0 (2011-2016)',
    'Compresor de válvula electrónica con aceite PAG 46 incluido.',
    'Compresor automotriz de alto caudal diseñado para climatización estable en tráfico pesado.',
    '{"voltaje":"12V","refrigerante":"R134a","aceite":"PAG 46","polea":"6PK"}',
    175.00, 35.00, 16.00, 274.05, 310.00, 'USD', 7, 3, 4.85, 19, '/media/products/compresor-ac.jpg', 1, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'compresores-ac'),
    'AC-CMP-003', 'CO-10916C',
    'Compresor A/C Sanden 5H14 Universal Polea 2A 12V',
    'compresor-ac-sanden-5h14-12v',
    'refrigeracion_vehicular', 'Sanden', 'SD5H14 / 2A', 'Camiones, pickups y maquinaria agrícola 12V',
    'Compresor rotativo de 5 pistones de uso rudo para trabajo pesado.',
    'Ideal para adaptaciones y flotas comerciales que requieren máxima durabilidad.',
    '{"voltaje":"12V","refrigerante":"R134a","polea":"2A Doble Canal"}',
    140.00, 30.00, 16.00, 211.12, NULL, 'USD', 3, 4, 4.90, 27, '/media/products/compresor-ac.jpg', 0, 1
  ),

  -- 2. Condensadores y Evaporadores
  (
    (SELECT category_id FROM categories WHERE slug = 'condensadores-evaporadores'),
    'AC-CND-015', '88450-02330',
    'Condensador Aluminio Flujo Paralelo Corolla',
    'condensador-aluminio-corolla-2014-2019',
    'refrigeracion_vehicular', 'Denso', 'CD-TY-014', 'Toyota Corolla 1.8 (2014-2019)',
    'Panel de microcanales de aluminio para máxima disipación térmica.',
    'Reemplazo directo con soportes OEM y conexiones de sellado rápido.',
    '{"material":"Aluminio","refrigerante":"R134a","tipo":"Flujo Paralelo"}',
    68.00, 32.00, 16.00, 104.12, 125.00, 'USD', 11, 4, 4.80, 15, '/media/products/condensador-ac.jpg', 0, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'condensadores-evaporadores'),
    'AC-EVP-008', '88501-0K060',
    'Evaporador A/C Delantero Aluminio Hilux / Fortuner',
    'evaporador-ac-hilux-fortuner',
    'refrigeracion_vehicular', 'KoyoCool', 'EV-HLX-08', 'Toyota Hilux / Fortuner (2006-2015)',
    'Serpentín de aluminio de alta transferencia con recubrimiento anticorrosivo.',
    'Evita fugas internas y recupera el frío original de cabina.',
    '{"material":"Aluminio","ubicacion":"Delantero"}',
    54.00, 35.00, 16.00, 84.56, 98.00, 'USD', 6, 3, 4.75, 12, '/media/products/condensador-ac.jpg', 0, 1
  ),

  -- 3. Gases y Aceites Refrigerantes
  (
    (SELECT category_id FROM categories WHERE slug = 'gases-aceites-refrigerantes'),
    'AC-GAS-1234', 'R1234YF-5KG',
    'Cilindro Gas Refrigerante R1234yf 5 kg Nueva Generación',
    'cilindro-gas-r1234yf-5kg',
    'refrigeracion_vehicular', 'Honeywell', 'R1234YF-5K', 'Vehículos modernos (2018+) sistema R1234yf',
    'Refrigerante ecológico de bajo GWP con pureza certificada.',
    'Indispensable para talleres especializados en vehículos híbridos y última generación.',
    '{"tipo":"R1234yf","peso_kg":5.0,"pureza":"99.9%"}',
    185.00, 28.00, 16.00, 274.69, NULL, 'USD', 5, 2, 4.95, 14, '/media/products/gas-r134a.jpg', 1, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'gases-aceites-refrigerantes'),
    'AC-PAG-046', 'PAG46-250ML',
    'Aceite Sintético PAG 46 con Trazador UV (250 ml)',
    'aceite-sintetico-pag-46-uv-250ml',
    'refrigeracion_vehicular', 'Errecom', 'PAG46-UV', 'Compresores R134a (Denso / Sanden)',
    'Lubricante sintético higroscópico con aditivo detector de fugas UV.',
    'Protege pistones y sellos del compresor contra desgaste prematuro.',
    '{"viscosidad":"ISO 46","volumen_ml":250,"incluye_uv":true}',
    7.50, 45.00, 16.00, 12.62, 15.00, 'USD', 28, 8, 4.90, 31, '/media/products/gas-r134a.jpg', 0, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'gases-aceites-refrigerantes'),
    'AC-PAG-100', 'PAG100-250ML',
    'Aceite Sintético PAG 100 Alta Viscosidad (250 ml)',
    'aceite-sintetico-pag-100-250ml',
    'refrigeracion_vehicular', 'Errecom', 'PAG100-250', 'Compresores rotativos y paletas R134a',
    'Estabilidad térmica superior para sistemas de alto trabajo.',
    'Previene cavitación y mantiene sellos lubricados a altas RPM.',
    '{"viscosidad":"ISO 100","volumen_ml":250}',
    8.00, 45.00, 16.00, 13.46, NULL, 'USD', 22, 6, 4.80, 18, '/media/products/gas-r134a.jpg', 0, 1
  ),

  -- 4. Filtros y Válvulas A/C
  (
    (SELECT category_id FROM categories WHERE slug = 'filtros-valvulas-ac'),
    'AC-VLV-022', '88515-02090',
    'Válvula de Expansión Bloque Aluminio + O-Rings',
    'valvula-expansion-bloque-orings',
    'refrigeracion_vehicular', 'Four Seasons', 'TXV-BLQ-22', 'Toyota / Honda / Hyundai sistemas R134a',
    'Regulación precisa de caudal de refrigerante hacia el evaporador.',
    'Incluye kit de O-rings verdes HNBR resistentes a R134a y aceite PAG.',
    '{"tipo":"Bloque","refrigerante":"R134a"}',
    16.00, 40.00, 16.00, 25.98, 32.00, 'USD', 19, 5, 4.75, 22, '/media/banners/promo-ac.jpg', 0, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'filtros-valvulas-ac'),
    'AC-FLT-010', 'RD-10912C',
    'Filtro Deshidratador Acero con Visor de Líquido',
    'filtro-deshidratador-visor-liquido',
    'refrigeracion_vehicular', 'UAC', 'FD-VIS-10', 'Universal líneas 3/8 O-ring macho/macho',
    'Retiene humedad, ácidos e impurezas metálicas del circuito A/C.',
    'Recomendado reemplazar en cada cambio de compresor o apertura del sistema.',
    '{"conexion":"3/8 O-ring","desecante":"XH-9"}',
    12.50, 40.00, 16.00, 20.30, NULL, 'USD', 24, 6, 4.85, 16, '/media/banners/promo-ac.jpg', 0, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'filtros-valvulas-ac'),
    'AC-PRS-005', '88719-33020',
    'Sensor Presostato Trinario A/C 3 Pines',
    'sensor-presostato-trinario-3-pines',
    'refrigeracion_vehicular', 'Denso', 'PS-TRI-05', 'Toyota / Chevrolet / Ford 12V',
    'Protege el compresor contra alta y baja presión y activa electroventilador.',
    'Calibración OEM para corte seguro en presiones extremas.',
    '{"pines":3,"rosca":"M11x1.0"}',
    14.00, 38.00, 16.00, 22.41, NULL, 'USD', 2, 5, 4.70, 9, '/media/banners/promo-ac.jpg', 0, 1
  ),

  -- 5. Iluminación LED Automotriz
  (
    (SELECT category_id FROM categories WHERE slug = 'iluminacion-led'),
    'VH-LED-H4', 'LED-H4-18K',
    'Kit Bombillos LED H4 Alta/Baja 6500K 18000 LM',
    'kit-bombillos-led-h4-6500k',
    'variados_vehiculos', 'AutoPro Vision', 'PRO-H4-18K', 'Universal socket H4 (9003 / HB2)',
    'Corte de luz perfecto sin encandilar con doble disipador de cobre.',
    'Instalación Plug & Play con protección IP68 contra agua y polvo.',
    '{"socket":"H4","color":"6500K","lumenes":18000}',
    24.00, 42.00, 16.00, 39.53, 49.00, 'USD', 21, 6, 4.90, 54, '/media/products/led-h11.jpg', 1, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'iluminacion-led'),
    'VH-LED-9005', 'LED-9005-16K',
    'Kit Bombillos LED 9005 / HB3 Turbo Fan 6000K',
    'kit-bombillos-led-9005-hb3',
    'variados_vehiculos', 'AutoPro Vision', 'TURBO-9005', 'Universal socket 9005 / HB3',
    'Encendido instantáneo de alta penetración para luz alta y neblineros.',
    'Chip CSP automotriz con vida útil superior a 30.000 horas.',
    '{"socket":"9005 / HB3","color":"6000K","lumenes":16000}',
    22.00, 40.00, 16.00, 35.73, 45.00, 'USD', 15, 5, 4.80, 28, '/media/products/led-h11.jpg', 0, 1
  ),

  -- 6. Accesorios y Cuidado
  (
    (SELECT category_id FROM categories WHERE slug = 'accesorios-cuidado'),
    'VH-CAR-009', 'KIT-DET-09',
    'Kit Detailing & Cuidado Automotriz 7 Piezas',
    'kit-detailing-cuidado-automotriz-7-pzas',
    'variados_vehiculos', 'BlackDetail', 'BD-KIT-07', 'Todo tipo de vehículo',
    'Shampoo pH neutro, cera líquida, limpiador de tablero y microfibras.',
    'Todo lo necesario para mantener pintura, rines y cabina impecables.',
    '{"piezas":7,"incluye_microfibra":true}',
    16.00, 45.00, 16.00, 26.91, 34.00, 'USD', 16, 5, 4.88, 41, '/media/products/kit-cuidado.jpg', 1, 1
  ),
  (
    (SELECT category_id FROM categories WHERE slug = 'accesorios-cuidado'),
    'VH-CAR-012', 'VAC-12V-PRO',
    'Aspiradora Portátil 12V Alta Succión con Filtro HEPA',
    'aspiradora-portatil-12v-hepa',
    'variados_vehiculos', 'AutoGear', 'AG-VAC-12V', 'Conexión encendedor 12V universal',
    'Compacta y potente con boquillas para ranuras de A/C y tapicería.',
    'Incluye cable de 4.5 metros, cepillo y estuche de transporte.',
    '{"voltaje":"12V","potencia_w":120,"filtro":"HEPA lavable"}',
    19.00, 42.00, 16.00, 31.29, 39.99, 'USD', 9, 4, 4.75, 23, '/media/products/kit-cuidado.jpg', 0, 1
  )
ON DUPLICATE KEY UPDATE
  sale_price = VALUES(sale_price),
  stock_quantity = VALUES(stock_quantity),
  thumbnail_url = VALUES(thumbnail_url),
  is_featured = VALUES(is_featured);
