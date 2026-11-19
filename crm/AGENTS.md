# Reglas de Capa: Frontend CRM (`crm/`)

- **Alcance permitido:** Exclusivamente `crm/`.
- **Prohibido:** Modificar archivos dentro de `backend/`, `database/` o `tienda/`. Si el panel requiere nuevos campos o endpoints, solicitar actualización previa de `docs/api-contracts.md` y del `backend/` en un paso separado.
- **Lineamientos de UI y Seguridad:**
  - Aplicación interactiva regida por `UI = f(State)` con flujo de datos unidireccional.
  - **Zero Trust / Deny by Default:** Todas las rutas del CRM (excepto `/login`) requieren sesión válida verificada contra la API y validación de rol (`admin`, `vendedor`, `almacen`).
  - **Módulos obligatorios:** Dashboard, Gestión del Carrusel de Banners (controla la portada de `tienda/`), Inventario y Productos, Ventas/Pedidos, y Clientes.
  - **Optimistic UI controlada:** Permitir toggles ágiles (ej. activar/desactivar banner o cambiar orden) con reversión automática si la API responde error.
  - **Atomic Design + Skeleton Screens + Code Splitting por módulo.**
  - **Idempotencia en cliente:** Generar y reenviar `Idempotency-Key` (UUID v4) en formularios de registro de ventas y movimientos de inventario para evitar duplicados ante reintentos de red.
