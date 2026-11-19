#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/backend/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: No existe ${ENV_FILE}. Copia backend/.env.example a backend/.env primero." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

echo "[1/4] Creando esquema tienda_crm..."
mariadb < "${ROOT_DIR}/database/migrations/001_initial_schema.sql"
mariadb < "${ROOT_DIR}/database/migrations/003_store_settings.sql"
mariadb < "${ROOT_DIR}/database/migrations/004_product_pricing_model.sql"
mariadb < "${ROOT_DIR}/database/migrations/005_bcv_exchange_rate.sql"
mariadb < "${ROOT_DIR}/database/migrations/006_payment_methods_and_receipts.sql"

echo "[2/4] Cargando categorías, productos y banners iniciales..."
mariadb < "${ROOT_DIR}/database/seeds/001_catalog_seed.sql"

echo "[3/4] Creando usuario PoLP '${DB_USER}'..."
mariadb -e "
CREATE OR REPLACE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
CREATE OR REPLACE USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
GRANT SELECT, INSERT, UPDATE ON ${DB_NAME}.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
"

echo "[4/4] Creando usuario administrador del CRM (admin@autofrio.local)..."
cd "${ROOT_DIR}/backend"
SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@autofrio.local}" \
SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-123456}" \
npm run seed:admin

echo "Listo: MariaDB aprovisionada y usuario admin creado."
