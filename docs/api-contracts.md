# Contrato de Datos Inmutable — API REST v1

> **Regla de Gobernanza (Sección 7.2):** Este documento es la fuente única de verdad entre `backend/`, `tienda/` y `crm/`. Ninguna clave existente puede renombrarse o eliminarse sin versionar el endpoint (`/api/v2`).

## 1. Convenciones Globales

- **Base URL:** `/api/v1` (excepto healthchecks en raíz `/health/*`).
- **Content-Type:** `application/json; charset=utf-8`.
- **Cabeceras estándar:**
  - `X-Request-Id`: UUID v4 (generado por el cliente o por el servidor; siempre devuelto en la respuesta).
  - `Authorization: Bearer <access_token>`: obligatorio en todos los endpoints `/api/v1/crm/*` y `/api/v1/auth/me`.
  - `Idempotency-Key: <uuid-v4>`: obligatorio en operaciones críticas de escritura (`POST /api/v1/store/orders`, `POST /api/v1/crm/sales`, `POST /api/v1/crm/inventory/movements`).

### Formato de Respuesta JSON Estándar

**Éxito:**
```json
{
  "status": "success",
  "data": {},
  "message": "Operación completada correctamente"
}
```

**Error:**
```json
{
  "status": "error",
  "data": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "sku", "issue": "El SKU es obligatorio" }
    ]
  },
  "message": "Los datos enviados no son válidos"
}
```

### Códigos HTTP Soportados
- `200 OK`: Consulta o actualización exitosa.
- `201 Created`: Recurso creado exitosamente.
- `400 Bad Request`: Error de validación de frontera o cabecera `Idempotency-Key` faltante/inválida.
- `401 Unauthorized`: Token ausente, expirado o inválido.
- `403 Forbidden`: Usuario autenticado sin permisos para el rol/recurso.
- `404 Not Found`: Recurso inexistente o eliminado lógicamente.
- `409 Conflict`: Conflicto de unicidad (SKU, slug, email) o stock insuficiente.
- `422 Unprocessable Entity`: Violación de regla de dominio (ej. transición de estado de venta inválida).
- `429 Too Many Requests`: Límite de peticiones excedido.
- `500 Internal Server Error`: Error no controlado (sin filtrar trazas internas ni SQL).
- `503 Service Unavailable`: Fallo de dependencia crítica (ej. MariaDB no disponible en `/health/ready`).

---

## 2. Observabilidad (`/health`)

| Método | Ruta | Auth | Respuesta |
| :--- | :--- | :--- | :--- |
| `GET` | `/health/live` | Pública | `200` `{ status: "success", data: { uptime_seconds, timestamp }, message: "Service is alive" }` |
| `GET` | `/health/ready` | Pública | `200` / `503` `{ status: "success" \| "error", data: { database: "up" \| "down" }, message: "..." }` |

---

## 3. Autenticación (`/api/v1/auth`)

### `POST /api/v1/auth/register`
- Registro público de cuenta para clientes de la tienda (`role: "cliente"`). Crea el usuario, registra/vincula su ficha en `customers` e inicia sesión devolviendo `access_token` y cookie `refresh_token`.
- **Request:**
  ```json
  {
    "full_name": "Nestor Alvarez",
    "email": "nestor@example.com",
    "password": "******",
    "phone": "04145617028",
    "document_id": "V-18234567",
    "shipping_address": "Calle Nicaragua #7",
    "city": "Ciudad Bolívar"
  }
  ```
- **Códigos:** `201`, `400`, `409` (correo ya registrado).

### `POST /api/v1/auth/login`
- **Request:**
  ```json
  {
    "email": "admin@autofrio.local",
    "password": "********"
  }
  ```
- **Response `200`:**
  ```json
  {
    "status": "success",
    "data": {
      "access_token": "<jwt>",
      "expires_in_seconds": 900,
      "user": {
        "user_id": 1,
        "full_name": "Administrador Principal",
        "email": "admin@autofrio.local",
        "role": "admin"
      }
    },
    "message": "Sesión iniciada correctamente"
  }
  ```
  *(El `refresh_token` se entrega en cookie `HttpOnly; Secure; SameSite=Strict`.)*

### `POST /api/v1/auth/refresh`
- Renueva `access_token` rotando el `refresh_token` almacenado con hash en MariaDB.
- **Códigos:** `200`, `401`.

### `POST /api/v1/auth/logout`
- Revoca el `refresh_token` actual en base de datos y limpia la cookie.
- **Códigos:** `200`, `401`.

### `GET /api/v1/auth/me`
- Devuelve el perfil del usuario autenticado (`user_id`, `full_name`, `email`, `role`).
- **Códigos:** `200`, `401`.

---

## 4. Endpoints Públicos de la Tienda (`/api/v1/store`)

### 4.1 Carrusel de Banners (Alimentado desde el CRM)
#### `GET /api/v1/store/banners`
- Devuelve los banners activos, dentro de su ventana de vigencia (`starts_at <= NOW() <= ends_at` si están definidos) y ordenados por `display_order ASC`.
- **Response `200`:**
  ```json
  {
    "status": "success",
    "data": {
      "items": [
        {
          "banner_id": 1,
          "badge_text": "REFRIGERACIÓN VEHICULAR PRO",
          "title": "Potencia el Frío de",
          "highlight_text": "Tu Vehículo",
          "subtitle": "Compresores, condensadores, gases refrigerantes y accesorios de alto rendimiento.",
          "image_url": "/media/banners/hero-ac-pro.webp",
          "image_alt": "Compresor de aire acondicionado automotriz de alto rendimiento",
          "cta_label": "Explorar Catálogo",
          "cta_url": "/catalogo?categoria=compresores-ac",
          "display_order": 1
        }
      ]
    },
    "message": "Banners activos obtenidos"
  }
  ```

### 4.2 Categorías
#### `GET /api/v1/store/categories`
- Query opcional: `?featured=true`.
- **Response `200`:**
  ```json
  {
    "status": "success",
    "data": {
      "items": [
        {
          "category_id": 1,
          "name": "Compresores A/C",
          "slug": "compresores-ac",
          "subtitle": "Máximo rendimiento térmico",
          "description": "Compresores nuevos y OEM para autos, camionetas y flotas.",
          "image_url": "/media/categories/compresores.webp",
          "product_line": "refrigeracion_vehicular",
          "display_order": 1,
          "active_products_count": 14
        }
      ]
    },
    "message": "Categorías obtenidas"
  }
  ```

### 4.3 Catálogo y Detalle de Producto
#### `GET /api/v1/store/products`
- Query params soportados:
  - `q`: búsqueda por nombre, SKU, código OEM o compatibilidad.
  - `category_slug`: filtrar por categoría.
  - `product_line`: `refrigeracion_vehicular` | `variados_vehiculos`.
  - `featured`: `true` | `false`.
  - `in_stock`: `true` | `false`.
  - `min_price`, `max_price`: rango decimal.
  - `sort`: `featured` | `price_asc` | `price_desc` | `newest` | `rating_desc`.
  - `page` (default `1`), `page_size` (default `12`, máx `48`).
- **Response `200`:**
  ```json
  {
    "status": "success",
    "data": {
      "items": [
        {
          "product_id": 101,
          "sku": "AC-CMP-001",
          "oem_code": "88310-02710",
          "name": "Compresor A/C 6SEU14C 12V",
          "slug": "compresor-ac-6seu14c-12v",
          "category_id": 1,
          "category_name": "Compresores A/C",
          "product_line": "refrigeracion_vehicular",
          "brand": "Denso OEM",
          "vehicle_compatibility": "Toyota Corolla 1.8 (2014-2019)",
          "price": 245.00,
          "compare_at_price": 279.00,
          "currency": "USD",
          "stock_quantity": 8,
          "in_stock": true,
          "rating_average": 4.9,
          "rating_count": 34,
          "thumbnail_url": "/media/products/ac-cmp-001.webp",
          "is_featured": true
        }
      ],
      "pagination": {
        "page": 1,
        "page_size": 12,
        "total_items": 42,
        "total_pages": 4
      }
    },
    "message": "Catálogo obtenido"
  }
  ```

#### `GET /api/v1/store/products/:slug`
- Devuelve el detalle completo del producto incluyendo `description`, `technical_specs` (JSON estructurado: voltaje, refrigerante compatible `R134a`/`R1234yf`, aceite recomendado `PAG 46`, garantía) y galería `images`.
- **Códigos:** `200`, `404`.

### 4.4 Creación de Pedido Online (Idempotente)
#### `POST /api/v1/store/orders`
- **Headers obligatorios:** `Idempotency-Key: <uuid-v4>`
- **Request:**
  ```json
  {
    "customer": {
      "full_name": "Carlos Méndez",
      "email": "carlos.mendez@example.com",
      "phone": "+584121234567",
      "document_id": "V-18234567",
      "shipping_address": "Av. Bolívar, Edif. Centro, Local 4",
      "city": "Valencia"
    },
    "payment_method": "transferencia",
    "notes": "Confirmar compatibilidad con Corolla 2017 antes de despachar",
    "items": [
      { "product_id": 101, "quantity": 1 }
    ]
  }
  ```
- **Response `201`:**
  ```json
  {
    "status": "success",
    "data": {
      "order_id": 5001,
      "order_number": "ORD-2026-005001",
      "order_status": "pendiente",
      "subtotal": 245.00,
      "tax_amount": 0.00,
      "total_amount": 245.00,
      "currency": "USD",
      "created_at": "2026-11-19T14:30:00Z"
    },
    "message": "Pedido registrado correctamente"
  }
  ```
- **Códigos:** `201`, `400`, `409` (stock insuficiente), `422`.

---

## 5. Endpoints Administrativos del CRM (`/api/v1/crm`)

> Todos requieren `Authorization: Bearer <access_token>` y verificación RBAC (`deny by default`).

### 5.1 Dashboard KPIs
#### `GET /api/v1/crm/dashboard/summary`
- **Roles:** `admin`, `vendedor`, `almacen`.
- **Query:** `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- **Data:** `total_sales_amount`, `orders_count`, `pending_orders_count`, `low_stock_products_count`, `active_banners_count`, `top_selling_products`, `recent_orders`.

### 5.2 Gestión del Carrusel de Banners (Controla `tienda/`)
- **Roles:** `admin` (lectura permitida también a `vendedor`).

| Método | Ruta | Descripción | Códigos |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/banners` | Lista todos los banners (activos e inactivos) ordenados por `display_order`. | `200`, `401`, `403` |
| `POST` | `/api/v1/crm/banners` | Crea un nuevo slide para el carrusel de la tienda. | `201`, `400`, `401`, `403` |
| `PUT` | `/api/v1/crm/banners/:banner_id` | Actualiza textos, imagen, CTA, orden o vigencia del banner. | `200`, `400`, `404` |
| `PATCH` | `/api/v1/crm/banners/:banner_id/status` | Activa o desactiva un banner (`{ "is_active": true \| false }`). | `200`, `400`, `404` |
| `PATCH` | `/api/v1/crm/banners/reorder` | Reordena slides en lote (`{ "ordered_banner_ids": [3, 1, 2] }`). | `200`, `400`, `422` |
| `PATCH` | `/api/v1/crm/banners/:banner_id/archive` | Soft-delete (`deleted_at = NOW()`, `is_active = 0`). | `200`, `404` |

**Payload de creación/edición de Banner:**
```json
{
  "badge_text": "REFRIGERACIÓN VEHICULAR PRO",
  "title": "Potencia el Frío de",
  "highlight_text": "Tu Vehículo",
  "subtitle": "Compresores, condensadores y repuestos A/C con garantía.",
  "image_url": "/media/banners/hero-ac-pro.webp",
  "image_alt": "Sistema de aire acondicionado vehicular",
  "cta_label": "Ver Compresores",
  "cta_url": "/catalogo?categoria=compresores-ac",
  "display_order": 1,
  "is_active": true,
  "starts_at": null,
  "ends_at": null
}
```

### 5.3 Categorías y Productos (Inventario Maestro)
- **Roles:** `admin`, `almacen` (lectura permitida a `vendedor`).

| Método | Ruta | Descripción | Códigos |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/categories` | Lista todas las categorías con conteo de productos. | `200` |
| `POST` | `/api/v1/crm/categories` | Crea una categoría. | `201`, `400`, `409` |
| `PUT` | `/api/v1/crm/categories/:category_id` | Edita una categoría. | `200`, `400`, `404`, `409` |
| `GET` | `/api/v1/crm/products` | Lista paginada con costo unitario, precio, stock actual y stock mínimo. | `200` |
| `POST` | `/api/v1/crm/products` | Crea producto con especificaciones técnicas A/C y stock inicial. | `201`, `400`, `409` |
| `PUT` | `/api/v1/crm/products/:product_id` | Actualiza datos comerciales y técnicos del producto (el stock se modifica vía movimientos). | `200`, `400`, `404`, `409` |
| `PATCH` | `/api/v1/crm/products/:product_id/status` | Activa o desactiva producto en la tienda (`{ "is_active": boolean }`). | `200`, `404` |

### 5.4 Control de Inventario y Kardex
- **Roles:** `admin`, `almacen`.

| Método | Ruta | Descripción | Códigos |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/inventory/alerts` | Lista productos donde `stock_quantity <= min_stock_threshold`. | `200` |
| `GET` | `/api/v1/crm/inventory/movements` | Historial/kardex paginado filtrable por `product_id`, `movement_type`, `from`, `to`. | `200` |
| `POST` | `/api/v1/crm/inventory/movements` | Registra entrada, salida manual, ajuste o devolución. **Requiere `Idempotency-Key`.** | `201`, `400`, `409`, `422` |

**Payload de `POST /api/v1/crm/inventory/movements`:**
```json
{
  "product_id": 101,
  "movement_type": "entrada",
  "quantity": 10,
  "unit_cost": 165.00,
  "reference_code": "COMPRA-2026-089",
  "notes": "Reposición lote Denso noviembre"
}
```
Valores válidos de `movement_type`: `entrada`, `salida_manual`, `ajuste_positivo`, `ajuste_negativo`, `devolucion`.

### 5.5 Gestión de Ventas y Pedidos
- **Roles:** `admin`, `vendedor` (lectura/despacho para `almacen`).

| Método | Ruta | Descripción | Códigos |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/sales` | Lista pedidos web y ventas directas con filtros (`order_status`, `sales_channel`, `from`, `to`, `q`). | `200` |
| `GET` | `/api/v1/crm/sales/:order_id` | Detalle completo de la venta, líneas de productos, cliente e historial. | `200`, `404` |
| `POST` | `/api/v1/crm/sales` | Registra venta directa desde el CRM (canal `crm_mostrador` o `crm_whatsapp`). **Requiere `Idempotency-Key`.** | `201`, `400`, `409`, `422` |
| `PATCH` | `/api/v1/crm/sales/:order_id/status` | Transición de estado de venta. Si pasa a `cancelado`, revierte stock mediante movimiento `devolucion` en la misma transacción ACID. | `200`, `400`, `404`, `422` |

Estados permitidos de `order_status`: `pendiente`, `confirmado`, `pagado`, `despachado`, `entregado`, `cancelado`.

### 5.6 Clientes CRM
- **Roles:** `admin`, `vendedor`.

| Método | Ruta | Descripción | Códigos |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/customers` | Lista paginada con búsqueda por nombre, teléfono, documento o correo. | `200` |
| `GET` | `/api/v1/crm/customers/:customer_id` | Perfil del cliente + resumen de ventas y vehículos registrados. | `200`, `404` |
| `POST` | `/api/v1/crm/customers` | Crea un cliente desde el CRM. | `201`, `400`, `409` |
| `PUT` | `/api/v1/crm/customers/:customer_id` | Actualiza datos de contacto, dirección y notas comerciales. | `200`, `400`, `404`, `409` |

### 4.5 Configuración Pública de la Tienda (`/api/v1/store/settings`)
#### `GET /api/v1/store/settings`
- Devuelve parámetros públicos configurables desde el CRM (como el umbral de envío gratis).
- **Response `200`:**
  ```json
  {
    "status": "success",
    "data": {
      "free_shipping_threshold": 150.00,
      "free_shipping_enabled": true,
      "currency": "USD",
      "bcv_rate": 50.0000,
      "show_bs_prices": true
    },
    "message": "Configuración de tienda obtenida"
  }
  ```

### 5.7 Configuración de la Tienda desde CRM (`/api/v1/crm/settings`)
- **Roles:** lectura (`admin`, `vendedor`, `almacen`), actualización (`admin`).

| Método | Ruta | Descripción | Códigos |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/crm/settings` | Obtiene la configuración actual de envío gratis, moneda y tasa BCV. | `200`, `401`, `403` |
| `PUT` | `/api/v1/crm/settings` | Actualiza `free_shipping_threshold`, `free_shipping_enabled`, `currency`, `bcv_rate` y `show_bs_prices`. | `200`, `400`, `401`, `403` |

### 5.3.1 Campos de Modelo y Estructura de Precios/Costos en Productos CRM
Los endpoints `GET /api/v1/crm/products`, `POST /api/v1/crm/products` y `PUT /api/v1/crm/products/:product_id` incluyen además:
- `model_name` (`string | null`): modelo del producto o aplicación vehicular.
- `profit_margin_pct` (`number >= 0`): porcentaje de utilidad sobre costo.
- `tax_rate_pct` (`number >= 0`): porcentaje de impuesto aplicado.
- `cost_price` (`number >= 0`): costo unitario.
- `sale_price` (`number >= 0`): PVP final (`cost_price * (1 + profit_margin_pct/100) * (1 + tax_rate_pct/100)`).

### 5.8 Métodos de Pago Digitales y Comprobante de Pago
- `store_settings` incluye `payment_accounts` con la configuración de:
  - `pago_movil`: `{ enabled, bank, phone, document_id, holder_name }`
  - `transferencia`: `{ enabled, bank, account_number, account_type, document_id, holder_name }`
  - `zelle`: `{ enabled, email, holder_name }`
  - `binance`: `{ enabled, pay_id, email, holder_name }`
- `POST /api/v1/store/orders` acepta `payment_method` en `efectivo | transferencia | tarjeta | pago_movil | zelle | binance | otro` y el campo opcional `payment_receipt_data` (Data URL de imagen de captura de pago, máx. 2 MB).
- `GET /api/v1/crm/sales/:order_id` devuelve `payment_receipt_data` para revisión en el CRM.
