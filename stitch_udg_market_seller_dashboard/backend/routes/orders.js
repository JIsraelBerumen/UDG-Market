const { Router } = require('express');
const crypto = require('node:crypto');
const { pool, withTransaction } = require('../db');
const { parseId, parseQuantity } = require('../lib/validation');
const { requireAuth, requireSeller } = require('../middleware/auth');

const router = Router();
const PAYMENT_METHODS = new Set(['cash', 'spei', 'transfer', 'other']);
const CANCELLATION_REASONS = new Set([
  'not_on_campus',
  'changed_time_or_location',
  'no_longer_needed',
  'seller_unavailable',
  'other'
]);

function makeOrderCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `UDG-${timestamp}-${suffix}`;
}

function orderError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getOrderItems(orderIds) {
  if (!orderIds.length) return new Map();
  const placeholders = orderIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT id, order_id AS orderId, product_id AS productId,
            product_name_snapshot AS productName, unit_price AS unitPrice,
            quantity, line_total AS lineTotal
     FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`,
    orderIds
  );
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.orderId)) grouped.set(row.orderId, []);
    grouped.get(row.orderId).push({
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      unitPrice: Number(row.unitPrice),
      quantity: row.quantity,
      lineTotal: Number(row.lineTotal)
    });
  }
  return grouped;
}

router.post('/', requireAuth, async (req, res) => {
  const body = req.body || {};
  const items = body.items;
  const pickupLocationId = parseId(body.pickupLocationId);
  const paymentMethod = body.paymentMethod;
  const pickupDate = typeof body.pickupAt === 'string' ? new Date(body.pickupAt) : null;

  if (!Array.isArray(items) || items.length < 1 || items.length > 30 ||
      !pickupLocationId || !PAYMENT_METHODS.has(paymentMethod) ||
      !pickupDate || Number.isNaN(pickupDate.getTime()) || pickupDate.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Revisa productos, punto de entrega, horario y método de pago.' });
  }
  const quantities = new Map();
  for (const item of items) {
    const productId = parseId(item && item.productId);
    const quantity = parseQuantity(item && item.quantity);
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Cada producto requiere un ID y una cantidad válida.' });
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }
  if ([...quantities.values()].some((quantity) => quantity > 10000)) {
    return res.status(400).json({ error: 'La cantidad solicitada supera el límite permitido.' });
  }

  const order = await withTransaction(async (connection) => {
    const productIds = [...quantities.keys()].sort((a, b) => a - b);
    const products = [];
    for (const productId of productIds) {
      const [rows] = await connection.execute(
        `SELECT p.id, p.seller_id AS sellerId, p.name, p.price, p.stock,
                p.is_active AS isActive, sp.accepts_orders AS acceptsOrders
         FROM products p
         JOIN seller_profiles sp ON sp.user_id = p.seller_id
         JOIN users u ON u.id = sp.user_id
         WHERE p.id = ? AND u.is_active = TRUE FOR UPDATE`,
        [productId]
      );
      if (!rows.length) throw orderError(404, 'Uno de los productos ya no está disponible.');
      const product = rows[0];
      if (!product.isActive || !product.acceptsOrders) {
        throw orderError(409, 'El vendedor o el producto no está recibiendo pedidos.');
      }
      const quantity = quantities.get(productId);
      if (product.stock < quantity) {
        throw orderError(409, `No hay suficiente stock de "${product.name}".`);
      }
      products.push({ ...product, quantity, unitPrice: Number(product.price) });
    }

    const sellerId = products[0].sellerId;
    if (products.some((product) => product.sellerId !== sellerId)) {
      throw orderError(400, 'Un pedido solo puede contener productos de una tienda.');
    }
    if (sellerId === req.session.user.id) {
      throw orderError(400, 'No puedes hacer una reserva en tu propia tienda.');
    }

    const [locations] = await connection.execute(
      `SELECT name, details FROM pickup_locations
       WHERE id = ? AND seller_id = ? AND is_active = TRUE`,
      [pickupLocationId, sellerId]
    );
    if (!locations.length) {
      throw orderError(400, 'El punto de entrega no pertenece a la tienda o ya no está activo.');
    }
    const locationSnapshot = [locations[0].name, locations[0].details].filter(Boolean).join(' - ');
    const subtotalCents = products.reduce(
      (sum, product) => sum + Math.round(product.unitPrice * 100) * product.quantity,
      0
    );
    const total = subtotalCents / 100;
    const orderCode = makeOrderCode();
    const [result] = await connection.execute(
      `INSERT INTO orders
        (order_code, buyer_id, seller_id, pickup_location_id, pickup_location_snapshot,
         pickup_at, status, subtotal, total)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        orderCode,
        req.session.user.id,
        sellerId,
        pickupLocationId,
        locationSnapshot,
        pickupDate ? pickupDate : null,
        total,
        total
      ]
    );

    for (const product of products) {
      const lineTotal = Math.round(product.unitPrice * 100) * product.quantity / 100;
      await connection.execute(
        `INSERT INTO order_items
          (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [result.insertId, product.id, product.name, product.unitPrice, product.quantity, lineTotal]
      );
      const remainingStock = product.stock - product.quantity;
      const autoPaused = remainingStock === 0;
      await connection.execute(
        `UPDATE products SET stock = ?, is_active = ?, auto_paused = ?
         WHERE id = ?`,
        [remainingStock, !autoPaused, autoPaused, product.id]
      );
    }
    await connection.execute(
      `INSERT INTO payments (order_id, method, status, amount)
       VALUES (?, ?, 'pending', ?)`,
      [result.insertId, paymentMethod, total]
    );

    return {
      id: result.insertId,
      orderCode,
      status: 'pending',
      total,
      paymentStatus: 'pending'
    };
  });
  res.status(201).json({ order });
});

router.get('/', requireAuth, async (req, res) => {
  const conditions = [];
  const values = [];
  if (req.session.user.role === 'admin') {
    if (req.query.as === 'buyer') {
      conditions.push('o.buyer_id = ?');
      values.push(req.session.user.id);
    } else if (req.query.as === 'seller') {
      conditions.push('o.seller_id = ?');
      values.push(req.session.user.id);
    } else {
      conditions.push('(o.buyer_id = ? OR o.seller_id = ?)');
      values.push(req.session.user.id, req.session.user.id);
    }
  } else if (['seller', 'both'].includes(req.session.user.role) && req.query.as === 'seller') {
    conditions.push('o.seller_id = ?');
    values.push(req.session.user.id);
  } else if (['seller', 'both'].includes(req.session.user.role) && req.query.as === 'buyer') {
    conditions.push('o.buyer_id = ?');
    values.push(req.session.user.id);
  } else {
    conditions.push('(o.buyer_id = ? OR o.seller_id = ?)');
    values.push(req.session.user.id, req.session.user.id);
  }

  if (req.query.status) {
    if (!['pending', 'confirmed', 'ready', 'delivered', 'cancelled'].includes(req.query.status)) {
      return res.status(400).json({ error: 'El estado del pedido no es válido.' });
    }
    conditions.push('o.status = ?');
    values.push(req.query.status);
  }
  const [rows] = await pool.execute(
    `SELECT o.id, o.order_code AS orderCode, o.buyer_id AS buyerId,
            buyer.full_name AS buyerName, o.seller_id AS sellerId,
            seller.full_name AS sellerName, o.pickup_location_snapshot AS pickupLocation,
            o.pickup_at AS pickupAt, o.status, o.subtotal, o.total,
            o.created_at AS createdAt, o.confirmed_at AS confirmedAt,
            o.delivered_at AS deliveredAt, pay.method AS paymentMethod,
            pay.status AS paymentStatus
     FROM orders o
     JOIN users buyer ON buyer.id = o.buyer_id
     JOIN users seller ON seller.id = o.seller_id
     LEFT JOIN payments pay ON pay.order_id = o.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.created_at DESC LIMIT 100`,
    values
  );
  const items = await getOrderItems(rows.map((row) => row.id));
  res.json({
    orders: rows.map((row) => ({
      ...row,
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      items: items.get(row.id) || []
    }))
  });
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El pedido no es válido.' });
  const [rows] = await pool.execute(
    `SELECT o.id, o.order_code AS orderCode, o.buyer_id AS buyerId,
            buyer.full_name AS buyerName, o.seller_id AS sellerId,
            seller.full_name AS sellerName, o.pickup_location_snapshot AS pickupLocation,
            o.pickup_at AS pickupAt, o.status, o.subtotal, o.total,
            o.created_at AS createdAt, o.confirmed_at AS confirmedAt,
            o.delivered_at AS deliveredAt, pay.method AS paymentMethod,
            pay.status AS paymentStatus, cancel.reason_code AS cancellationReason,
            cancel.details AS cancellationDetails
     FROM orders o
     JOIN users buyer ON buyer.id = o.buyer_id
     JOIN users seller ON seller.id = o.seller_id
     LEFT JOIN payments pay ON pay.order_id = o.id
     LEFT JOIN order_cancellations cancel ON cancel.order_id = o.id
     WHERE o.id = ? AND (o.buyer_id = ? OR o.seller_id = ? OR ? = 'admin')`,
    [id, req.session.user.id, req.session.user.id, req.session.user.role]
  );
  if (!rows.length) return res.status(404).json({ error: 'No se encontró el pedido.' });
  const order = rows[0];
  const items = await getOrderItems([id]);
  res.json({
    order: {
      ...order,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      items: items.get(id) || []
    }
  });
});

router.post('/:id/confirm', requireSeller, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El pedido no es válido.' });
  const [result] = await pool.execute(
    `UPDATE orders SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND seller_id = ? AND status = 'pending'`,
    [id, req.session.user.id]
  );
  if (!result.affectedRows) {
    return res.status(409).json({ error: 'El pedido no existe o ya no está pendiente.' });
  }
  res.json({ status: 'confirmed' });
});

router.post('/:id/deliver', requireSeller, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El pedido no es válido.' });
  const [result] = await pool.execute(
    `UPDATE orders SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
     WHERE id = ? AND seller_id = ? AND status IN ('confirmed', 'ready')`,
    [id, req.session.user.id]
  );
  if (!result.affectedRows) {
    return res.status(409).json({ error: 'Solo se pueden entregar pedidos confirmados o listos.' });
  }
  res.json({ status: 'delivered' });
});

router.post('/:id/ready', requireSeller, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El pedido no es válido.' });
  const [result] = await pool.execute(
    `UPDATE orders SET status = 'ready'
     WHERE id = ? AND seller_id = ? AND status = 'confirmed'`,
    [id, req.session.user.id]
  );
  if (!result.affectedRows) {
    return res.status(409).json({ error: 'Solo se pueden preparar pedidos confirmados.' });
  }
  res.json({ status: 'ready' });
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const { reasonCode, details } = req.body || {};
  if (!id || !CANCELLATION_REASONS.has(reasonCode) ||
      (details != null && (typeof details !== 'string' || details.length > 500))) {
    return res.status(400).json({ error: 'Revisa el motivo de cancelación.' });
  }
  const cancelled = await withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT id, buyer_id AS buyerId, seller_id AS sellerId, status
       FROM orders WHERE id = ? FOR UPDATE`,
      [id]
    );
    if (!rows.length) return 'missing';
    const order = rows[0];
    const userId = req.session.user.id;
    if (order.buyerId !== userId && order.sellerId !== userId &&
        req.session.user.role !== 'admin') return 'forbidden';
    if (['delivered', 'cancelled'].includes(order.status)) return 'conflict';

    await connection.execute(
      `INSERT INTO order_cancellations (order_id, cancelled_by, reason_code, details)
       VALUES (?, ?, ?, ?)`,
      [id, userId, reasonCode, details ? details.trim() : null]
    );
    await connection.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id]);
    await connection.execute(
      `UPDATE payments SET status = 'refunded'
       WHERE order_id = ? AND status = 'paid'`,
      [id]
    );
    await connection.execute(
      `UPDATE wallet_passes SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
       WHERE order_id = ? AND status = 'issued'`,
      [id]
    );

    const [items] = await connection.execute(
      'SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ? FOR UPDATE',
      [id]
    );
    for (const item of items) {
      if (item.productId == null) continue;
      const [products] = await connection.execute(
        `SELECT stock, is_active AS isActive, auto_paused AS autoPaused FROM products
         WHERE id = ? AND seller_id = ? FOR UPDATE`,
        [item.productId, order.sellerId]
      );
      if (!products.length) continue;
      const product = products[0];
      const newStock = product.stock + item.quantity;
      const reactivate = Boolean(product.autoPaused);
      await connection.execute(
        `UPDATE products SET stock = ?, is_active = ?, auto_paused = ?
         WHERE id = ?`,
        [
          newStock,
          reactivate ? true : Boolean(product.isActive),
          reactivate ? false : Boolean(product.autoPaused),
          item.productId
        ]
      );
    }
    return 'cancelled';
  });

  if (cancelled === 'missing') return res.status(404).json({ error: 'No se encontró el pedido.' });
  if (cancelled === 'forbidden') return res.status(403).json({ error: 'No tienes permiso para cancelar este pedido.' });
  if (cancelled === 'conflict') return res.status(409).json({ error: 'El pedido ya no se puede cancelar.' });
  res.json({ status: 'cancelled' });
});

router.post('/:id/payment/confirm', requireSeller, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El pedido no es válido.' });
  const [result] = await pool.execute(
    `UPDATE payments p
     JOIN orders o ON o.id = p.order_id
     SET p.status = 'paid', p.paid_at = CURRENT_TIMESTAMP
     WHERE p.order_id = ? AND o.seller_id = ? AND o.status IN ('confirmed', 'ready', 'delivered')
       AND p.status = 'pending'`,
    [id, req.session.user.id]
  );
  if (!result.affectedRows) {
    return res.status(409).json({ error: 'No hay un pago pendiente para confirmar.' });
  }
  res.json({ paymentStatus: 'paid' });
});

module.exports = router;
