/**
 * Contrato mock tipado (alineado a docs/api-contracts.md).
 * Se usa SOLO como respaldo (Graceful Degradation) cuando la API no responde.
 */
import type {
  ProductDetail,
  ProductQuestion,
  ProductReview,
  StoreBanner,
  StoreCategory,
  StoreProductSummary,
  TrendingSearchTerm,
} from './contracts';

export const mockBanners: readonly StoreBanner[] = [
  {
    banner_id: 1,
    badge_text: 'REFRIGERACIÓN VEHICULAR PRO',
    title: 'Potencia el Frío de',
    highlight_text: 'Tu Vehículo',
    subtitle: 'Compresores A/C, condensadores, gases refrigerantes y repuestos de precisión con despacho rápido.',
    image_url: '',
    image_alt: 'Sistema de aire acondicionado vehicular',
    cta_label: 'Explorar Catálogo',
    cta_url: '/catalogo?linea=refrigeracion_vehicular',
    display_order: 1,
  },
  {
    banner_id: 2,
    badge_text: 'VARIADOS Y ACCESORIOS AUTOMOTRICES',
    title: 'Equipa y Mejora',
    highlight_text: 'Cada Kilómetro',
    subtitle: 'Iluminación LED de alto rendimiento, kits de cuidado automotriz y accesorios seleccionados.',
    image_url: '',
    image_alt: 'Accesorios e iluminación LED',
    cta_label: 'Ver Accesorios',
    cta_url: '/catalogo?linea=variados_vehiculos',
    display_order: 2,
  },
  {
    banner_id: 3,
    badge_text: 'STOCK GARANTIZADO PARA TALLERES',
    title: 'Suministro Directo en',
    highlight_text: 'Gases R134a',
    subtitle: 'Precios competitivos, compatibilidad verificada y control de inventario en tiempo real.',
    image_url: '',
    image_alt: 'Gases refrigerantes R134a',
    cta_label: 'Ver Categorías',
    cta_url: '/categorias',
    display_order: 3,
  },
];

const cat = (
  id: number,
  name: string,
  slug: string,
  subtitle: string,
  line: StoreCategory['product_line'],
  count: number,
): StoreCategory => ({
  category_id: id,
  name,
  slug,
  subtitle,
  description: null,
  image_url: null,
  product_line: line,
  display_order: id,
  active_products_count: count,
});

export const mockCategories: readonly StoreCategory[] = [
  cat(1, 'Compresores A/C', 'compresores-ac', 'Máximo rendimiento térmico', 'refrigeracion_vehicular', 1),
  cat(2, 'Condensadores y Evaporadores', 'condensadores-evaporadores', 'Intercambio térmico eficiente', 'refrigeracion_vehicular', 1),
  cat(3, 'Gases y Aceites', 'gases-aceites-refrigerantes', 'R134a, R1234yf y PAG/POE', 'refrigeracion_vehicular', 1),
  cat(4, 'Filtros y Válvulas A/C', 'filtros-valvulas-ac', 'Protección del circuito', 'refrigeracion_vehicular', 0),
  cat(5, 'Iluminación LED', 'iluminacion-led', 'Visibilidad de alto alcance', 'variados_vehiculos', 1),
  cat(6, 'Accesorios y Cuidado', 'accesorios-cuidado', 'Estilo y protección diaria', 'variados_vehiculos', 0),
];

const prod = (
  id: number,
  sku: string,
  oem: string | null,
  name: string,
  slug: string,
  categoryId: number,
  categoryName: string,
  line: StoreProductSummary['product_line'],
  brand: string,
  compat: string,
  price: number,
  compare: number | null,
  stock: number,
  rating: number,
  reviews: number,
  soldCount: number,
  searchCount: number,
  storeId = 1,
  storeName = 'NEXORA Oficial',
  storeSlug = 'nexora-oficial',
): StoreProductSummary => ({
  product_id: id,
  store_id: storeId,
  store_name: storeName,
  store_slug: storeSlug,
  sku,
  oem_code: oem,
  name,
  slug,
  category_id: categoryId,
  category_name: categoryName,
  product_line: line,
  brand,
  vehicle_compatibility: compat,
  price,
  compare_at_price: compare,
  currency: 'USD',
  stock_quantity: stock,
  in_stock: stock > 0,
  rating_average: rating,
  rating_count: reviews,
  thumbnail_url: null,
  is_featured: true,
  sold_count: soldCount,
  search_count: searchCount,
  popularity_score: Number((soldCount * 3 + searchCount * 1.2 + rating * Math.log(1 + reviews) * 0.8 + 5).toFixed(2)),
});

export const mockProducts: readonly StoreProductSummary[] = [
  prod(101, 'AC-CMP-001', '88310-02710', 'Compresor A/C 6SEU14C 12V Polea 6PK', 'compresor-ac-6seu14c-12v-6pk', 1, 'Compresores A/C', 'refrigeracion_vehicular', 'Denso OEM', 'Toyota Corolla 1.8 (2014-2019)', 245, 279, 12, 4.9, 34, 24, 38, 1, 'NEXORA Oficial', 'nexora-oficial'),
  prod(102, 'AC-CND-014', '97606-2H010', 'Condensador Flujo Paralelo Aluminio con Secador', 'condensador-flujo-paralelo-aluminio', 2, 'Condensadores y Evaporadores', 'refrigeracion_vehicular', 'Nissens', 'Hyundai Elantra / Kia Forte (2013-2018)', 118, 135, 9, 4.8, 21, 14, 29, 2, 'FríoCar Pro', 'friocar-pro'),
  prod(103, 'AC-GAS-134', 'R134A-13.6KG', 'Cilindro Gas Refrigerante R134a 13.6 kg', 'cilindro-gas-refrigerante-r134a-13-6kg', 3, 'Gases y Aceites', 'refrigeracion_vehicular', 'Chemours', 'Universal sistemas R134a', 145, null, 18, 4.95, 48, 31, 45, 1, 'NEXORA Oficial', 'nexora-oficial'),
  prod(104, 'VH-LED-H11', null, 'Kit Bombillos LED H11 6000K 16000 LM Canbus', 'kit-bombillos-led-h11-6000k', 5, 'Iluminación LED', 'variados_vehiculos', 'AutoPro Vision', 'Universal socket H11 / H8 / H9', 39.99, 49.99, 25, 4.85, 63, 19, 52, 3, 'LED & Tuning VE', 'led-tuning-ve'),
  prod(105, 'AC-CMP-002', '97701-2S500', 'Compresor A/C DVE16 12V Polea 6PK', 'compresor-ac-dve16-12v-6pk', 1, 'Compresores A/C', 'refrigeracion_vehicular', 'Doowon OEM', 'Hyundai Tucson / Kia Sportage (2011-2016)', 250.56, 285, 8, 4.9, 16, 15, 22, 2, 'FríoCar Pro', 'friocar-pro'),
  prod(106, 'AC-EVP-021', '88501-0K060', 'Evaporador Aluminio A/C Delantero', 'evaporador-aluminio-ac-hilux', 2, 'Condensadores y Evaporadores', 'refrigeracion_vehicular', 'Denso', 'Toyota Hilux / Fortuner (2012-2020)', 97.09, 115, 14, 4.8, 11, 10, 18, 1, 'NEXORA Oficial', 'nexora-oficial'),
  prod(107, 'AC-OIL-PAG46', 'PAG46-250ML', 'Aceite Sintético PAG-46 con Trazador UV 250ml', 'aceite-pag-46-trazador-uv', 3, 'Gases y Aceites', 'refrigeracion_vehicular', 'Four Seasons', 'Sistemas A/C R134a', 14.62, 18, 32, 4.85, 22, 28, 30, 2, 'FríoCar Pro', 'friocar-pro'),
  prod(108, 'AC-VLV-108', '88515-02060', 'Válvula de Expansión Bloque Aluminio', 'valvula-expansion-bloque-aluminio', 4, 'Filtros y Válvulas', 'refrigeracion_vehicular', 'Santech', 'Toyota Corolla / Yaris (2010-2020)', 22.74, 28, 20, 4.75, 9, 12, 16, 1, 'NEXORA Oficial', 'nexora-oficial'),
  prod(109, 'VH-LED-H4', null, 'Kit Bombillos LED H4 Bi-LED 18000 LM Turbofan', 'kit-bombillos-led-h4-18000lm', 5, 'Iluminación LED', 'variados_vehiculos', 'AutoPro Vision', 'Universal socket H4 (Alta y Baja)', 43.73, 55, 19, 4.9, 27, 21, 34, 3, 'LED & Tuning VE', 'led-tuning-ve'),
  prod(110, 'VH-CAR-012', null, 'Kit Detailing Cerámico + Microfibra 600GSM', 'kit-detailing-ceramico-microfibra', 6, 'Accesorios y Cuidado', 'variados_vehiculos', 'Nexora Care', 'Todo tipo de pintura automotriz', 29.23, 36, 24, 4.85, 18, 17, 25, 3, 'LED & Tuning VE', 'led-tuning-ve'),
  prod(111, 'VH-ACC-045', null, 'Compresor Portátil Digital 12V 150 PSI USB-C', 'compresor-portatil-digital-150psi', 6, 'Accesorios y Cuidado', 'variados_vehiculos', 'RoadMaster', 'Vehículos, SUV y motos', 43.85, 52, 15, 4.7, 14, 11, 20, 1, 'NEXORA Oficial', 'nexora-oficial'),
];

export function getMockProductDetail(slug: string): ProductDetail | null {
  const found = mockProducts.find((p) => p.slug === slug);
  if (!found) return null;
  const imgByLine: Record<string, string> = {
    'AC-CMP-001': '/media/products/compresor-ac.jpg',
    'AC-CMP-002': '/media/products/compresor-ac.jpg',
    'AC-CND-014': '/media/products/condensador-ac.jpg',
    'AC-EVP-021': '/media/products/condensador-ac.jpg',
    'AC-VLV-108': '/media/products/condensador-ac.jpg',
    'AC-GAS-134': '/media/products/gas-r134a.jpg',
    'AC-OIL-PAG46': '/media/products/gas-r134a.jpg',
    'VH-LED-H11': '/media/products/led-h11.jpg',
    'VH-LED-H4': '/media/products/led-h11.jpg',
    'VH-CAR-012': '/media/products/kit-cuidado.jpg',
    'VH-ACC-045': '/media/products/kit-cuidado.jpg',
  };
  const imgUrl = imgByLine[found.sku] ?? '/media/products/compresor-ac.jpg';
  return {
    ...found,
    short_description: `Repuesto / accesorio verificado marca ${found.brand ?? 'OEM'} compatible con ${found.vehicle_compatibility ?? 'múltiples vehículos'}.`,
    description: `Garantía directa con la tienda ${found.store_name ?? 'NEXORA Oficial'}. Despacho rápido a nivel nacional.`,
    technical_specs: null,
    store: {
      store_id: found.store_id ?? 1,
      name: found.store_name ?? 'NEXORA Oficial',
      slug: found.store_slug ?? 'nexora-oficial',
      city: found.store_id === 2 ? 'Caracas' : found.store_id === 3 ? 'Maracay' : 'Valencia',
      rating_average: 4.9,
      rating_count: 28,
      sales_count: 64,
      response_rate_pct: 98,
      is_verified: true,
    },
    images: [{ product_image_id: 1, image_url: imgUrl, image_alt: found.name, display_order: 0, is_primary: true }],
  };
}

export const mockQuestions: readonly ProductQuestion[] = [
  {
    question_id: 1,
    product_id: 104,
    store_id: 3,
    customer_name: 'Carlos Pérez',
    question_text: '¿Tienen disponibilidad inmediata y dan garantía?',
    answer_text: '¡Sí! Tenemos stock inmediato y garantía de 6 meses por defecto de fábrica.',
    answered_at: new Date().toISOString(),
    status: 'answered',
    created_at: new Date().toISOString(),
  },
];

export const mockReviews: readonly ProductReview[] = [
  {
    review_id: 1,
    product_id: 104,
    store_id: 3,
    order_id: 1,
    reviewer_name: 'María Fernanda G.',
    product_rating: 5,
    seller_rating: 5,
    title: 'Excelente calidad y atención rápida',
    comment: 'Llegó el mismo día, ilumina muchísimo mejor que los halógenos originales y la tienda respondió todas mis dudas.',
    seller_reply: '¡Muchas gracias por tu compra María! Estamos a la orden.',
    seller_replied_at: new Date().toISOString(),
    is_verified_purchase: true,
    created_at: new Date().toISOString(),
  },
];

export const mockTrendingSearches: readonly TrendingSearchTerm[] = [
  { term: 'r134a', search_count: 45 },
  { term: 'compresor', search_count: 38 },
  { term: 'led h11', search_count: 52 },
  { term: 'condensador', search_count: 29 },
];
