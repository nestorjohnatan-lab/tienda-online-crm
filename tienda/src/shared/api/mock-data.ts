/**
 * Contrato mock tipado (alineado a docs/api-contracts.md).
 * Se usa SOLO como respaldo (Graceful Degradation) cuando la API no responde.
 */
import type { StoreBanner, StoreCategory, StoreProductSummary } from './contracts';

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
): StoreProductSummary => ({
  product_id: id,
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
});

export const mockProducts: readonly StoreProductSummary[] = [
  prod(101, 'AC-CMP-001', '88310-02710', 'Compresor A/C 6SEU14C 12V Polea 6PK', 'compresor-ac-6seu14c-12v-6pk', 1, 'Compresores A/C', 'refrigeracion_vehicular', 'Denso OEM', 'Toyota Corolla 1.8 (2014-2019)', 245, 279, 12, 4.9, 34),
  prod(102, 'AC-CND-014', '97606-2H010', 'Condensador Flujo Paralelo Aluminio con Secador', 'condensador-flujo-paralelo-aluminio', 2, 'Condensadores y Evaporadores', 'refrigeracion_vehicular', 'Nissens', 'Hyundai Elantra / Kia Forte (2013-2018)', 118, 135, 9, 4.8, 21),
  prod(103, 'AC-GAS-134', 'R134A-13.6KG', 'Cilindro Gas Refrigerante R134a 13.6 kg', 'cilindro-gas-refrigerante-r134a-13-6kg', 3, 'Gases y Aceites', 'refrigeracion_vehicular', 'Chemours', 'Universal sistemas R134a', 145, null, 18, 4.95, 48),
  prod(104, 'VH-LED-H11', null, 'Kit Bombillos LED H11 6000K 16000 LM Canbus', 'kit-bombillos-led-h11-6000k', 5, 'Iluminación LED', 'variados_vehiculos', 'AutoPro Vision', 'Universal socket H11 / H8 / H9', 39.99, 49.99, 25, 4.85, 63),
];
