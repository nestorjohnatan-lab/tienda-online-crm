# Reglas de Capa: Backend (`backend/`)

- **Alcance permitido:** Exclusivamente `backend/` y migraciones en `database/`.
- **Prohibido:** Modificar archivos dentro de `tienda/` o `crm/`.
- **Arquitectura obligatoria:** DDD + Ports & Adapters (`domain/`, `application/`, `infrastructure/`) por módulo (`auth`, `catalog`, `banners`, `inventory`, `sales`, `customers`, `health`).
- **Reglas técnicas clave:**
  - TypeScript en modo estricto (`"strict": true`, sin `any` implícitos).
  - Consultas preparadas parametrizadas obligatorias (prevención de SQLi).
  - Ninguna cadena HTML o CSS embebida en controladores o servicios.
  - Contrato JSON inmutable `{ status, data, message }` según `docs/api-contracts.md`.
  - Programación defensiva en controladores/validadores; programación ofensiva (excepciones explícitas) en invariantes de dominio.
  - Contraseñas hasheadas con Argon2id (o bcrypt como respaldo), nunca algoritmos propios.
  - Endpoints de creación de órdenes, ventas y movimientos de inventario protegidos con `Idempotency-Key` y transacciones ACID.
