import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { PoolConnection } from 'mariadb';
import type { PaginatedData } from '../../../shared/contracts/api-response.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/app-error.js';
import { dbPool, withTransaction } from '../../../shared/infrastructure/database/pool.js';
import {
  type CreatedOrderSummary,
  type CreateOrderInTxInput,
  type CrmSaleDetail,
  type CrmSaleListItem,
  type DashboardSummary,
  type OrderStatus,
  type PaymentMethod,
  type SaleRepositoryPort,
  type SalesChannel,
} from '../domain/sale.repository.js';

interface SvaPedidoRow {
  id: number;
  nro_pedido: string;
  cliente_id: number;
  cliente_nombre: string;
  tipo_entrega: string;
  direccion_delivery: string | null;
  telefono_contacto: string | null;
  forma_pago: string;
  referencia_pago: string | null;
  subtotal_usd: number;
  delivery_usd: number;
  total_usd: number;
  tasa_bcv_dia: number;
  estado: string;
  codigo_entrega: string | null;
  notas: string | null;
  created_at: Date;
}

function mapSvaEstadoToStatus(estado: string): OrderStatus {
  switch (estado) {
    case 'pendiente_verificacion':
      return 'pendiente';
    case 'pago_aprobado':
    case 'listo_para_retirar':
      return 'confirmado';
    case 'en_delivery':
      return 'despachado';
    case 'entregado':
      return 'entregado';
    case 'rechazado':
      return 'cancelado';
    default:
      return 'pendiente';
  }
}

function mapStatusToSvaEstado(status: OrderStatus): string {
  switch (status) {
    case 'pendiente':
      return 'pendiente_verificacion';
    case 'confirmado':
      return 'pago_aprobado';
    case 'pagado':
      return 'pago_aprobado';
    case 'despachado':
      return 'en_delivery';
    case 'entregado':
      return 'entregado';
    case 'cancelado':
      return 'rechazado';
    default:
      return 'pendiente_verificacion';
  }
}

export class MariaDbSaleRepository implements SaleRepositoryPort {
  async createOrderInTx(
    conn: PoolConnection,
    input: CreateOrderInTxInput,
  ): Promise<CreatedOrderSummary> {
    const customerId = await this.resolveCustomerId(conn, input);

    // Consolidar cantidades
    const aggregated = new Map<number, number>();
    for (const item of input.items) {
      aggregated.set(item.product_id, (aggregated.get(item.product_id) ?? 0) + item.quantity);
    }

    const lockedLines: {
      product_id: number;
      sku: string;
      name: string;
      quantity: number;
      unit_price: number;
      unit_cost: number;
      stock_before: number;
      line_total: number;
    }[] = [];

    let subtotal = 0;
    const sortedProductIds = [...aggregated.keys()].sort((a, b) => a - b);

    for (const productId of sortedProductIds) {
      const qty = aggregated.get(productId)!;
      const rows = (await conn.query(
        `SELECT id, codigo, nombre, precio_usd, costo_usd, stock_actual, estado
           FROM productos
          WHERE id = ?
          LIMIT 1 FOR UPDATE`,
        [productId],
      )) as {
        id: number;
        codigo: string;
        nombre: string;
        precio_usd: number;
        costo_usd: number;
        stock_actual: number;
        estado: string;
      }[];

      const prod = rows[0];
      if (!prod || prod.estado !== 'activo') {
        throw new NotFoundError(`Producto ${productId} no disponible`);
      }

      const stockBefore = Number(prod.stock_actual);
      if (stockBefore < qty) {
        throw new ConflictError(
          `Stock insuficiente para ${prod.codigo} (${prod.nombre}): disponible ${stockBefore}, solicitado ${qty}`,
          'INSUFFICIENT_STOCK',
        );
      }

      const unitPrice = Number(prod.precio_usd);
      const lineTotal = Number((unitPrice * qty).toFixed(2));
      subtotal = Number((subtotal + lineTotal).toFixed(2));

      lockedLines.push({
        product_id: Number(prod.id),
        sku: prod.codigo,
        name: prod.nombre,
        quantity: qty,
        unit_price: unitPrice,
        unit_cost: Number(prod.costo_usd),
        stock_before: stockBefore,
        line_total: lineTotal,
      });
    }

    const discount = Math.min(Number(input.discount_amount.toFixed(2)), subtotal);
    const taxAmount = 0;
    const totalAmount = Number((subtotal - discount + taxAmount).toFixed(2));

    // Obtener tasa BCV y Binance activas desde configuración
    const configRows = (await conn.query(
      `SELECT clave, valor FROM configuracion WHERE clave IN ('tasa_bcv', 'tasa_binance')`,
    )) as { clave: string; valor: string }[];
    let tasaBcv = 88.00;
    let tasaBinance = 95.00;
    for (const cr of configRows) {
      if (cr.clave === 'tasa_bcv') tasaBcv = Number(cr.valor) || 88.00;
      if (cr.clave === 'tasa_binance') tasaBinance = Number(cr.valor) || 95.00;
    }

    const orderNumber = this.generateOrderNumber();
    const codigoEntrega = Math.floor(100000 + Math.random() * 900000).toString();
    const customerPhone = input.customer?.phone ?? '';
    const shippingAddress = input.shipping_address ?? input.customer?.shipping_address ?? 'Retiro en mostrador';

    let comprobantePath: string | null = null;
    let referenciaPago: string | null = null;

    if (input.payment_receipt_data) {
      if (input.payment_receipt_data.startsWith('data:image/')) {
        try {
          const match = input.payment_receipt_data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (match && match[1] && match[2]) {
            const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            const buffer = Buffer.from(match[2], 'base64');
            const fileName = `pago_${orderNumber}.${ext}`;
            const dir = '/srv/http/Mexora/sva_online/uploads/comprobantes';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, fileName), buffer);
            comprobantePath = `uploads/comprobantes/${fileName}`;
            referenciaPago = `PAGO-WEB-${orderNumber}`;
          }
        } catch (e) {
          console.error('Error saving payment receipt to disk:', e);
        }
      } else {
        referenciaPago = input.payment_receipt_data.slice(0, 100);
      }
    }

    const orderRes = (await conn.query(
      `INSERT INTO pedidos
        (nro_pedido, cliente_id, usuario_id, tipo_entrega, direccion_delivery,
         telefono_contacto, forma_pago, referencia_pago, comprobante_pago, subtotal_usd, delivery_usd,
         total_usd, tasa_bcv_dia, tasa_binance_dia, estado, codigo_entrega, notas)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, 'pendiente_verificacion', ?, ?)`,
      [
        orderNumber,
        customerId,
        shippingAddress ? 'delivery' : 'retira_tienda',
        shippingAddress,
        customerPhone,
        input.payment_method,
        referenciaPago,
        comprobantePath,
        subtotal,
        totalAmount,
        tasaBcv,
        tasaBinance,
        codigoEntrega,
        input.notes ?? null,
      ],
    )) as { insertId: number };

    const orderId = Number(orderRes.insertId);

    for (const line of lockedLines) {
      await conn.query(
        `INSERT INTO pedidos_detalles
          (pedido_id, producto_id, cantidad, precio_unitario_usd, total_linea_usd)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, line.product_id, line.quantity, line.unit_price, line.line_total],
      );

      const stockAfter = line.stock_before - line.quantity;
      await conn.query(`UPDATE productos SET stock_actual = ? WHERE id = ?`, [
        stockAfter,
        line.product_id,
      ]);

      await conn.query(
        `UPDATE productos_depositos SET stock_actual = ? WHERE producto_id = ? AND deposito_id = 1`,
        [stockAfter, line.product_id],
      );

      await conn.query(
        `INSERT INTO inventario_movimientos
          (producto_id, deposito_id, tipo, cantidad, motivo, usuario_id)
         VALUES (?, 1, 'descargo', ?, ?, 1)`,
        [line.product_id, line.quantity, `Venta Web Tienda Online ${orderNumber}`],
      );
    }

    return {
      order_id: orderId,
      order_number: orderNumber,
      order_status: 'pendiente',
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discount,
      total_amount: totalAmount,
      currency: 'USD',
      created_at: new Date().toISOString(),
    };
  }

  async listSales(params: {
    order_status?: OrderStatus | undefined;
    sales_channel?: SalesChannel | undefined;
    q?: string | undefined;
    page: number;
    page_size: number;
  }): Promise<PaginatedData<CrmSaleListItem>> {
    const conditions: string[] = ['1 = 1'];
    const sqlParams: unknown[] = [];

    if (params.order_status) {
      conditions.push('p.estado = ?');
      sqlParams.push(mapStatusToSvaEstado(params.order_status));
    }
    if (params.q) {
      conditions.push('(p.nro_pedido LIKE ? OR c.nombre LIKE ? OR c.telefono LIKE ?)');
      const like = `%${params.q}%`;
      sqlParams.push(like, like, like);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (params.page - 1) * params.page_size;

    const countRows = (await dbPool.query(
      `SELECT COUNT(*) AS total
         FROM pedidos p
         LEFT JOIN clientes c ON c.id = p.cliente_id
        WHERE ${whereClause}`,
      sqlParams,
    )) as { total: number }[];
    const totalItems = Number(countRows[0]?.total ?? 0);

    const rows = (await dbPool.query(
      `SELECT p.*, COALESCE(c.nombre, 'Cliente Web') AS cliente_nombre
         FROM pedidos p
         LEFT JOIN clientes c ON c.id = p.cliente_id
        WHERE ${whereClause}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?`,
      [...sqlParams, params.page_size, offset],
    )) as SvaPedidoRow[];

    return {
      items: rows.map((r) => this.mapListItem(r)),
      pagination: {
        page: params.page,
        page_size: params.page_size,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / params.page_size)),
      },
    };
  }

  async findSaleById(orderId: number): Promise<CrmSaleDetail | null> {
    const rows = (await dbPool.query(
      `SELECT p.*, COALESCE(c.nombre, 'Cliente Web') AS cliente_nombre
         FROM pedidos p
         LEFT JOIN clientes c ON c.id = p.cliente_id
        WHERE p.id = ?
        LIMIT 1`,
      [orderId],
    )) as SvaPedidoRow[];

    const row = rows[0];
    if (!row) return null;

    const items = (await dbPool.query(
      `SELECT pd.id AS order_item_id, pd.producto_id, pr.codigo AS sku_snapshot,
              pr.nombre AS product_name_snapshot, pd.cantidad, pd.precio_unitario_usd AS unit_price,
              pd.total_linea_usd AS line_total
         FROM pedidos_detalles pd
         INNER JOIN productos pr ON pr.id = pd.producto_id
        WHERE pd.pedido_id = ?
        ORDER BY pd.id ASC`,
      [orderId],
    )) as {
      order_item_id: number;
      product_id: number;
      sku_snapshot: string;
      product_name_snapshot: string;
      cantidad: number;
      unit_price: number;
      line_total: number;
    }[];

    const listItem = this.mapListItem(row);

    return {
      ...listItem,
      subtotal: Number(row.subtotal_usd),
      tax_amount: 0,
      discount_amount: 0,
      shipping_address: row.direccion_delivery,
      notes: row.notas,
      payment_receipt_data: row.referencia_pago ?? null,
      items: items.map((i) => ({
        order_item_id: Number(i.order_item_id),
        product_id: Number(i.product_id),
        sku_snapshot: i.sku_snapshot,
        product_name_snapshot: i.product_name_snapshot,
        quantity: Number(i.cantidad),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
      })),
    };
  }

  async updateOrderStatus(
    orderId: number,
    nextStatus: OrderStatus,
    _actorUserId: number,
  ): Promise<CrmSaleDetail> {
    const svaEstado = mapStatusToSvaEstado(nextStatus);
    await dbPool.query(`UPDATE pedidos SET estado = ? WHERE id = ?`, [svaEstado, orderId]);

    const updated = await this.findSaleById(orderId);
    if (!updated) throw new Error('Invariant broken: pedido actualizado no encontrado');
    return updated;
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [salesStats] = (await dbPool.query(
      `SELECT
          COALESCE(SUM(CASE WHEN estado <> 'rechazado' THEN total_usd ELSE 0 END), 0) AS total_sales_amount,
          COUNT(*) AS orders_count,
          COALESCE(SUM(CASE WHEN estado = 'pendiente_verificacion' THEN 1 ELSE 0 END), 0) AS pending_orders_count
         FROM pedidos`,
    )) as {
      total_sales_amount: number;
      orders_count: number;
      pending_orders_count: number;
    }[];

    const [lowStockRow] = (await dbPool.query(
      `SELECT COUNT(*) AS cnt
         FROM productos
        WHERE estado = 'activo' AND stock_actual <= stock_minimo`,
    )) as { cnt: number }[];

    const [bannersRow] = (await dbPool.query(
      `SELECT COUNT(*) AS cnt
         FROM banners_carrusel
        WHERE activo = 1`,
    )) as { cnt: number }[];

    const recentRows = (await dbPool.query(
      `SELECT p.*, COALESCE(c.nombre, 'Cliente Web') AS cliente_nombre
         FROM pedidos p
         LEFT JOIN clientes c ON c.id = p.cliente_id
        ORDER BY p.id DESC
        LIMIT 5`,
    )) as SvaPedidoRow[];

    return {
      total_sales_amount: Number(salesStats?.total_sales_amount ?? 0),
      orders_count: Number(salesStats?.orders_count ?? 0),
      pending_orders_count: Number(salesStats?.pending_orders_count ?? 0),
      low_stock_products_count: Number(lowStockRow?.cnt ?? 0),
      active_banners_count: Number(bannersRow?.cnt ?? 0),
      recent_orders: recentRows.map((r) => this.mapListItem(r)),
    };
  }

  private async resolveCustomerId(
    conn: PoolConnection,
    input: CreateOrderInTxInput,
  ): Promise<number> {
    if (input.customer_id) {
      const existing = (await conn.query(
        `SELECT id FROM clientes WHERE id = ? LIMIT 1`,
        [input.customer_id],
      )) as { id: number }[];
      if (existing[0]) return Number(existing[0].id);
    }

    if (!input.customer) {
      throw new ValidationError('Debe indicar customer_id o los datos del cliente');
    }

    const docId = input.customer.document_id || 'V-00000000';
    const email = input.customer.email ? input.customer.email.toLowerCase() : null;

    if (email) {
      const byEmail = (await conn.query(
        `SELECT id FROM clientes WHERE email = ? LIMIT 1`,
        [email],
      )) as { id: number }[];
      if (byEmail[0]) return Number(byEmail[0].id);
    }

    const byDoc = (await conn.query(
      `SELECT id FROM clientes WHERE cedula_rif = ? LIMIT 1`,
      [docId],
    )) as { id: number }[];
    if (byDoc[0]) return Number(byDoc[0].id);

    const inserted = (await conn.query(
      `INSERT INTO clientes
        (cedula_rif, nombre, direccion, telefono, email)
       VALUES (?, ?, ?, ?, ?)`,
      [
        docId,
        input.customer.full_name,
        input.customer.shipping_address,
        input.customer.phone,
        email,
      ],
    )) as { insertId: number };

    return Number(inserted.insertId);
  }

  private generateOrderNumber(): string {
    const year = new Date().getUTCFullYear();
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PED-${year}-${randomPart}`;
  }

  private mapListItem(r: SvaPedidoRow): CrmSaleListItem {
    return {
      order_id: Number(r.id),
      order_number: r.nro_pedido,
      customer_id: Number(r.cliente_id),
      customer_name: r.cliente_nombre ?? 'Cliente',
      sales_channel: 'tienda_web',
      order_status: mapSvaEstadoToStatus(r.estado),
      payment_method: (r.forma_pago as PaymentMethod) || 'pago_movil',
      total_amount: Number(r.total_usd),
      currency: 'USD',
      created_at: new Date(r.created_at).toISOString(),
    };
  }
}
