const { Router } = require('express');
const crypto = require('node:crypto');
const { pool, withTransaction } = require('../db');
const { parseId } = require('../lib/validation');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/orders/:orderId/pass', requireAuth, async (req, res) => {
  const orderId = parseId(req.params.orderId);
  if (!orderId) return res.status(400).json({ error: 'El pedido no es válido.' });

  const pass = await withTransaction(async (connection) => {
    const [orders] = await connection.execute(
      `SELECT id, order_code AS orderCode, status
       FROM orders WHERE id = ? AND buyer_id = ? FOR UPDATE`,
      [orderId, req.session.user.id]
    );
    if (!orders.length) return { error: 'missing' };
    const order = orders[0];
    if (!['confirmed', 'ready'].includes(order.status)) return { error: 'not_ready' };

    const serialNumber = `UDG-${order.id}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const qrToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');
    await connection.execute(
      `INSERT INTO wallet_passes (order_id, serial_number, qr_token_hash, status, revoked_at)
       VALUES (?, ?, ?, 'issued', NULL)
       ON DUPLICATE KEY UPDATE serial_number = VALUES(serial_number),
         qr_token_hash = VALUES(qr_token_hash), status = 'issued',
         issued_at = CURRENT_TIMESTAMP, revoked_at = NULL`,
      [orderId, serialNumber, tokenHash]
    );
    return { orderCode: order.orderCode, serialNumber, qrToken, status: order.status };
  });

  if (pass.error === 'missing') return res.status(404).json({ error: 'No se encontró el pedido.' });
  if (pass.error === 'not_ready') {
    return res.status(409).json({ error: 'El pase estará disponible cuando el vendedor confirme el pedido.' });
  }
  res.status(201).json({
    pass: {
      orderCode: pass.orderCode,
      serialNumber: pass.serialNumber,
      qrToken: pass.qrToken,
      orderStatus: pass.status
    },
    note: 'El QR es de un solo uso por emisión; solicitarlo de nuevo invalida el anterior. El archivo Apple Wallet requiere certificados del comercio.'
  });
});

router.post('/passes/validate', async (req, res) => {
  const token = req.body && req.body.qrToken;
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
    return res.status(400).json({ error: 'El pase no es válido.' });
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [passes] = await pool.execute(
    `SELECT wp.serial_number AS serialNumber, wp.status AS passStatus,
            o.order_code AS orderCode, o.status AS orderStatus
     FROM wallet_passes wp
     JOIN orders o ON o.id = wp.order_id
     WHERE wp.qr_token_hash = ? LIMIT 1`,
    [tokenHash]
  );
  if (!passes.length || passes[0].passStatus !== 'issued' ||
      !['confirmed', 'ready'].includes(passes[0].orderStatus)) {
    return res.status(404).json({ error: 'El pase expiró o no es válido.' });
  }
  res.json({ valid: true, pass: passes[0] });
});

module.exports = router;
