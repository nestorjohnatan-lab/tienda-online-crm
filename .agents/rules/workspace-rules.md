# Reglas del Workspace: Tienda Online de Refrigeración Vehicular & Accesorios + CRM

Este documento complementa las **Reglas Globales de Ingeniería** y define el rol, los límites estrictos de directorios y las convenciones operativas para este proyecto.

## 1. Rol del Workspace y Stack Oficial

- **Rol:** Arquitectura Full-Stack bajo **Protocolo Estricto de Aislamiento por Capas** (Sección 7 de las reglas globales).
- **Backend (`backend/`):** API REST en **Node.js 22+ / TypeScript** con arquitectura **DDD + Ports & Adapters (Hexagonal)** y controlador oficial para **MariaDB** con consultas preparadas.
- **Base de Datos (`database/`):** **MariaDB** local como almacén relacional ACID (integridad referencial, unicidad, `CHECK` constraints y soft-delete; cero lógica de negocio en `stored procedures` o `triggers`).
- **Frontend Tienda (`tienda/`):** Aplicación pública en **React + Vite + TypeScript**, inspirada en el sistema visual de `IU DESING/3cd2fbabf373bfa7c041f346ff0b5308.jpg`.
- **Frontend CRM (`crm/`):** Panel administrativo en **React + Vite + TypeScript** para control de ventas, inventario, clientes y gestión del carrusel de banners de la tienda.

## 2. Mapa de Fronteras y Directorios Permitidos / Prohibidos

| Capa / Tipo de tarea | Directorios permitidos | Directorios PROHIBIDOS |
| :--- | :--- | :--- |
| **Backend / API / Dominio** | `backend/`, `database/`, `docs/api-contracts.md` | `tienda/`, `crm/`, `IU DESING/` |
| **Frontend Tienda (UI pública)** | `tienda/`, `docs/design-system.md` | `backend/`, `database/`, `crm/`, `IU DESING/` |
| **Frontend CRM (Panel admin)** | `crm/`, `docs/design-system.md` | `backend/`, `database/`, `tienda/`, `IU DESING/` |
| **Referencia Visual** | Solo lectura en `IU DESING/` | Nunca modificar ni eliminar archivos en `IU DESING/` |

### Regla de Ejecución Secuencial (Full-Stack)
Cuando una funcionalidad nueva requiera cambios en varias capas, es **obligatorio** ejecutarla en pasos separados:
1. **Paso 1 — Contrato:** Definir o actualizar el contrato de datos en `docs/api-contracts.md`.
2. **Paso 2 — Backend:** Implementar, validar y probar el módulo en `backend/` y migraciones en `database/`.
3. **Paso 3 — Frontend:** Implementar las vistas en `tienda/` o `crm/` consumiendo el contrato documentado (un frontend a la vez).

Queda estrictamente prohibido mezclar ediciones de lógica de servidor/SQL y componentes visuales/CSS en el mismo paso de trabajo.

## 3. Reglas Inmutables del Proyecto

1. **Contrato JSON estándar (Sección 7.2):**
   Todas las respuestas HTTP de `backend/` deben respetar exactamente la estructura:
   ```json
   {
     "status": "success | error",
     "data": {},
     "message": "Descripción legible"
   }
   ```
   Jamás renombrar claves existentes sin versionar la API (`/api/v1` -> `/api/v2`).
2. **Stateless by Design:** Cero sesiones en memoria local de Node.js. Autenticación mediante JWT de corta duración + refresh tokens persistidos con hash en MariaDB.
3. **Idempotencia obligatoria:** Todo endpoint crítico de escritura (`POST /api/v1/store/orders`, `POST /api/v1/crm/sales`, `POST /api/v1/crm/inventory/movements`) exige cabecera `Idempotency-Key` respaldada por la tabla `idempotency_keys`.
4. **Mínimo Privilegio (PoLP):** El usuario de aplicación de MariaDB (`tienda_crm_app`) opera únicamente con `SELECT, INSERT, UPDATE` sobre el esquema `tienda_crm`. Se usa borrado lógico (`deleted_at` / `is_active`) en lugar de `DELETE` físico.
5. **Fail Fast & Validación en Frontera:** Validar variables de entorno al inicio y validar todo `body`, `params` y `query` en middlewares de entrada antes de invocar casos de uso o SQL.
6. **Observabilidad:** Mantener activos `/health/live`, `/health/ready` y logs estructurados en JSON con `request_id` / `trace_id`.
7. **Twelve-Factor App:** Prohibido hardcodear contraseñas, JWT secrets o credenciales de base de datos. Todo se inyecta vía `.env` (excluido en `.gitignore`).
8. **Control de Versiones:** GitHub Flow + ramas cortas + Conventional Commits + Squash & Merge vía Pull Request. Prohibido `push` directo o `push --force` a `main`.
