# Tienda Online de Refrigeración Vehicular & Accesorios + CRM

Plataforma desacoplada compuesta por una **Tienda Online** especializada en refrigeración vehicular y productos variados para vehículos, y un **CRM** para gestionar ventas, inventario, clientes y el carrusel de banners de la portada.

Inspiración visual de interfaz: [IU DESING/3cd2fbabf373bfa7c041f346ff0b5308.jpg](IU%20DESING/3cd2fbabf373bfa7c041f346ff0b5308.jpg)

---

## Estructura de Carpetas Separadas

```text
.
├── .agents/rules/           # Reglas del workspace (límites, roles y aislamiento)
├── .github/workflows/       # CI: Secret Scanning (Gitleaks), typecheck y tests
├── IU DESING/               # Referencia visual original (solo lectura)
├── docs/
│   ├── architecture.md      # Arquitectura DDD + Ports & Adapters y flujos críticos
│   ├── api-contracts.md     # Contrato de Datos Inmutable v1 (API Contract First)
│   └── design-system.md     # Sistema visual extraído de IU DESING
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql       # Esquema MariaDB (InnoDB, ACID, FK, CHECK)
│   │   └── 002_least_privilege_user.sql # Usuario de aplicación PoLP (SELECT/INSERT/UPDATE)
│   └── seeds/
│       └── 001_catalog_seed.sql         # Categorías, productos A/C + variados y banners iniciales
├── backend/                 # API REST Node.js 22+ / TypeScript (DDD + Hexagonal)
│   ├── AGENTS.md            # Reglas estrictas de capa backend
│   ├── .env.example         # Variables de entorno (Twelve-Factor App)
│   └── src/
│       ├── shared/          # Contratos JSON, config fail-fast, DB pool, logger JSON, middlewares
│       └── modules/         # health, auth, catalog, banners, inventory, sales, customers
├── tienda/                  # Frontend Tienda Online (React + Vite + TypeScript) — Puerto 5173
│   ├── AGENTS.md            # Reglas estrictas de capa tienda
│   ├── .env.example
│   └── src/
│       ├── app/             # Router y layout público
│       ├── shared/          # Contratos API, tokens CSS (IU DESING) y Atomic Design
│       └── features/        # home (carrusel dinámico), catalog, categories, product-detail, cart-checkout
└── crm/                     # Frontend Panel CRM (React + Vite + TypeScript) — Puerto 5174
    ├── AGENTS.md            # Reglas estrictas de capa CRM
    ├── .env.example
    └── src/
        ├── app/             # Router protegido (Zero Trust / RBAC) y layout administrativo
        ├── shared/          # Contratos API, tokens CSS y Atomic Design
        └── features/        # auth, dashboard, banners, inventory, sales, customers
```

---

## Puesta en Marcha de Base de Datos (MariaDB Local)

1. Crear esquema y tablas:
   ```bash
   mariadb -u root -p < database/migrations/001_initial_schema.sql
   ```
2. Crear usuario con **Mínimo Privilegio (PoLP)** editando previamente la contraseña temporal en una copia local o desde consola SQL (nunca commitear contraseñas):
   ```bash
   # Revisar instrucciones dentro de database/migrations/002_least_privilege_user.sql
   ```
3. Cargar categorías, productos iniciales de refrigeración vehicular/accesorios y banners base:
   ```bash
   mariadb -u root -p < database/seeds/001_catalog_seed.sql
   ```
4. Configurar archivos `.env` locales (ignorados por Git):
   ```bash
   cp backend/.env.example backend/.env
   cp tienda/.env.example tienda/.env
   cp crm/.env.example crm/.env
   ```

---

## Arranque local

| App | Carpeta | URL | Comando |
| :--- | :--- | :--- | :--- |
| API REST | `backend/` | http://localhost:3100 | `cd backend && npm run dev` |
| Tienda | `tienda/` | http://localhost:5173 | `cd tienda && npm run dev` |
| CRM | `crm/` | http://localhost:5174 | `cd crm && npm run dev` |

Primera vez: `npm install` en cada carpeta, copiar los `.env.example` a `.env`, aprovisionar MariaDB (sección anterior) y crear el admin:

```bash
cd backend && SEED_ADMIN_EMAIL="admin@autofrio.local" SEED_ADMIN_PASSWORD="<contraseña de 10+ caracteres>" npm run seed:admin
```

Si la API no responde, la tienda muestra datos de ejemplo con el mismo contrato; el CRM requiere la API.

## Estado de las fases

1. **Fase 1:** estructura, reglas, contrato de API y esquema MariaDB. ✔
2. **Fase 2 (`backend/`):** API con auth JWT + RBAC, catálogo, banners, inventario, ventas idempotentes, clientes y health. ✔
3. **Fase 3 (`tienda/`):** inicio con carrusel, categorías, catálogo, carrito y checkout. ✔
4. **Fase 4 (`crm/`):** login, dashboard, banners, inventario, ventas y clientes. ✔

Pendiente: alta de clientes/productos desde la UI del CRM, detalle de producto en la tienda y pruebas de integración contra MariaDB.
