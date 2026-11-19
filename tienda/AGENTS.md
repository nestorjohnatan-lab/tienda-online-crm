# Reglas de Capa: Frontend Tienda Online (`tienda/`)

- **Alcance permitido:** Exclusivamente `tienda/`.
- **Prohibido:** Modificar archivos dentro de `backend/`, `database/` o `crm/`. Si un componente necesita un dato que la API aún no expone, documentar la solicitud o usar un mock tipado alineado a `docs/api-contracts.md` sin tocar el backend.
- **Lineamientos de UI y UX:**
  - Inspiración visual obligatoria en `IU DESING/3cd2fbabf373bfa7c041f346ff0b5308.jpg` y `docs/design-system.md` (alternancia de secciones oscuras `#0B0D11` y blancas `#FFFFFF` con acento rojo automotriz `#E51A2E`).
  - **Mobile-First:** Estilos base pensados para móvil, expandiendo con `@media (min-width: ...)`.
  - **Zero CLS (`CLS = 0`):** Definir siempre `aspect-ratio` o dimensiones fijas para banners del carrusel, tarjetas de categorías y fotos de productos.
  - **Skeleton Screens:** Usar esqueletos geométricos en carga de carrusel, categorías y catálogo en lugar de spinners bloqueantes.
  - **Atomic Design:** Organizar UI reutilizable en `src/shared/ui/{atoms,molecules,organisms,templates}`.
  - **Code Splitting:** Carga diferida por rutas (`React.lazy`) para catálogo, detalle de producto y checkout.
  - **Separación de estado:** Estado del servidor (caché HTTP) separado del estado local de UI (carrito local, filtros, modales).
