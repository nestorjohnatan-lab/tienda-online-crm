# Sistema de Diseño Visual (Inspirado en `IU DESING`)

Referencia base: [3cd2fbabf373bfa7c041f346ff0b5308.jpg](file:///home/maguey/Proyectos/TIENDA%20ON%20LINE+CRM/IU%20DESING/3cd2fbabf373bfa7c041f346ff0b5308.jpg)

Este documento traduce el lenguaje visual de la referencia automotriz (alto contraste oscuro/blanco con acento rojo deportivo) al dominio de **refrigeración vehicular y productos variados para vehículos**, manteniendo coherencia entre `tienda/` y `crm/`.

---

## 1. Paleta de Color y Tokens

| Token CSS | Valor | Uso Principal |
| :--- | :--- | :--- |
| `--color-bg-dark` | `#0B0D11` | Navbar, Hero, sección Más Vendidos, banners promocionales, footer |
| `--color-surface-dark` | `#131720` | Tarjetas de producto sobre fondo oscuro, paneles secundarios, sidebar del CRM |
| `--color-surface-dark-elevated` | `#1A202C` | Inputs en modo oscuro, hover de tarjetas, barras de métricas |
| `--color-border-dark` | `#252C3A` | Bordes sutiles de tarjetas y divisores en secciones oscuras |
| `--color-bg-light` | `#FFFFFF` | Sección de Categorías, "Por qué elegirnos", vistas de lectura del CRM |
| `--color-surface-light` | `#F5F7FA` | Tarjetas de categoría, tablas suaves y estados de hover claros |
| `--color-border-light` | `#E2E8F0` | Bordes de tarjetas claras y tablas administrativas |
| `--color-accent-primary` | `#E51A2E` | CTA principal ("Comprar ahora", "Agregar al carrito"), subrayado activo, badge del carrito, iconos clave |
| `--color-accent-primary-hover` | `#C81426` | Estado hover/active de botones primarios |
| `--color-accent-cool` | `#0EA5E9` | Acento técnico opcional para badges de **Refrigeración / A/C** (ej. R134a, R1234yf, frío) |
| `--color-text-on-dark` | `#F8FAFC` | Títulos y texto principal sobre fondo oscuro |
| `--color-text-muted-dark` | `#94A3B8` | Subtítulos, descripciones y metadatos en secciones oscuras |
| `--color-text-on-light` | `#0F172A` | Títulos y texto principal sobre fondo claro |
| `--color-text-muted-light` | `#475569` | Descripciones en secciones claras |
| `--color-rating` | `#F59E0B` | Estrellas de valoración |
| `--color-success` | `#16A34A` | Stock disponible, pedido entregado, banner activo |
| `--color-warning` | `#D97706` | Alerta de stock bajo, pedido pendiente |
| `--color-danger` | `#DC2626` | Sin stock, error de validación, cancelado |

---

## 2. Tipografía y Jerarquía

- **Fuente de encabezados (Display):** `Montserrat` o `Plus Jakarta Sans` (pesos `700`, `800`), tracking ligeramente ajustado (`-0.02em`) para titulares impactantes estilo automotriz.
- **Fuente de cuerpo y UI:** `Inter` (pesos `400`, `500`, `600`).
- **Fuente monoespaciada (SKU, códigos OEM, precios y stock en CRM):** `JetBrains Mono` o `ui-monospace` con `font-variant-numeric: tabular-nums`.

---

## 3. Estructura de la Portada de `tienda/` (Mapeada al Diseño de Referencia)

La página de inicio replica el ritmo visual alternado (oscuro -> claro -> oscuro -> claro -> oscuro) de la referencia:

1. **Barra de Navegación Superior (Oscura `#0B0D11`, sticky):**
   - Izquierda: Logotipo automotriz con silueta y acento rojo.
   - Centro: `Inicio`, `Catálogo`, `Categorías`, `Refrigeración A/C`, `Contacto` (subrayado rojo en enlace activo).
   - Derecha: Buscador rápido, acceso cliente/CRM, botón carrito con contador circular rojo.
2. **Hero Carrusel de Banners (Oscuro, controlado desde el CRM):**
   - Carrusel a ancho completo con relación de aspecto reservada (`CLS = 0`).
   - Consume `GET /api/v1/store/banners`.
   - Cada slide muestra: etiqueta superior (`badge_text`), titular en blanco + palabra destacada en rojo (`title`, `highlight_text`), subtítulo (`subtitle`), imagen de fondo con degradado oscuro para garantizar contraste AA/AAA, y botón pill rojo con flecha (`cta_label` -> `cta_url`).
   - Controles discretos (prev/next + indicadores inferiores + pausa en hover + soporte de teclado accesible).
3. **Franja de Confianza (Oscura `#0E1117`):**
   - 4 bloques con icono lineal rojo: Envíos Rápidos, Pagos Seguros, Asesoría Técnica A/C, Repuestos Garantizados.
4. **Sección "Compra por Categoría" (Fondo Blanco `#FFFFFF`):**
   - Encabezado `COMPRA POR CATEGORÍA` + título + enlace `Ver todas las categorías ->`.
   - Grid responsive (2 cols móvil -> 3 tablet -> 6 escritorio) con tarjetas limpias: imagen con `aspect-ratio: 4/3`, nombre de categoría, subtítulo breve y botón circular con flecha (`->`).
   - Categorías clave: *Compresores A/C*, *Condensadores y Evaporadores*, *Gases y Aceites Refrigerantes*, *Filtros y Válvulas*, *Iluminación LED*, *Accesorios y Cuidado*.
5. **Sección "Más Vendidos / Destacados" (Fondo Oscuro `#0B0D11`):**
   - Encabezado `MÁS VENDIDOS` + enlace `Ver todo el catálogo ->`.
   - Grid de 4 tarjetas oscuras (`#131720` con borde `#252C3A`): imagen en caja oscura con `aspect-ratio: 4/3`, badge de tipo/stock, nombre del producto, valoración con estrellas, precio destacado y botón de ancho completo rojo `Agregar al carrito`.
6. **Banner Promocional Intermedio (Oscuro con visual automotriz):**
   - Bloque dividido (visual mecánico/A/C a la izquierda, texto y botón outline con flecha a la derecha).
7. **Sección "Por Qué Elegirnos" (Fondo Blanco `#FFFFFF`):**
   - 4 insignias con icono circular rojo de propuesta de valor.
8. **Reseñas de Clientes y Footer (Fondo Oscuro `#0B0D11`):**
   - 3 tarjetas translúcidas oscuras con testimonio, nombre y estrellas + footer compacto con enlaces y redes.

---

## 4. Coherencia Visual en `crm/`

El CRM reutiliza la misma identidad de marca adaptada a productividad diaria:
- **Sidebar oscuro (`#0B0D11` / `#131720`)** con indicador activo rojo (`#E51A2E`) para módulos: *Dashboard*, *Carrusel de Banners*, *Inventario y Productos*, *Categorías*, *Ventas y Pedidos*, *Clientes*.
- **Área de contenido clara (`#F5F7FA` / `#FFFFFF`)** para máxima legibilidad en tablas de inventario, kardex, estados de pedidos y formularios.
- **Vista previa en vivo del Banner:** En el módulo de Banners del CRM, el administrador ve cómo lucirá cada slide (título, palabra destacada en rojo, subtítulo, botón CTA) antes de publicarlo en la tienda.

---

## 5. Estándares Obligatorios de Frontend

- **Mobile-First:** Todo CSS parte de móvil (`< 640px`) y escala con `min-width: 640px`, `768px`, `1024px`, `1280px`.
- **CLS = 0:** Ninguna imagen o banner se renderiza sin `aspect-ratio` explícito o dimensiones reservadas.
- **Skeleton Screens:** Estados de carga con esqueletos geométricos en carrusel, tarjetas de categoría, catálogo y tablas del CRM.
- **Atomic Design:** Componentes compartidos organizados en `atoms/`, `molecules/`, `organisms/` y `templates/`.
