const { Router } = require('express');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { pool, withTransaction } = require('../db');
const { parseId } = require('../lib/validation');
const { createQrToken } = require('../lib/wallet-pass');
const { sessionSecret } = require('../config');
const { requireAuth, requireSeller } = require('../middleware/auth');

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

    const [existingPasses] = await connection.execute(
      `SELECT serial_number AS serialNumber, qr_token_hash AS qrTokenHash, status
       FROM wallet_passes WHERE order_id = ? FOR UPDATE`,
      [orderId]
    );
    let serialNumber = existingPasses[0] && existingPasses[0].status === 'issued'
      ? existingPasses[0].serialNumber
      : null;
    let qrToken = serialNumber
      ? createQrToken(order.id, serialNumber, sessionSecret)
      : null;
    let tokenHash = qrToken
      ? crypto.createHash('sha256').update(qrToken).digest('hex')
      : null;

    if (!serialNumber || existingPasses[0].qrTokenHash !== tokenHash) {
      serialNumber = `UDG-${order.id}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      qrToken = createQrToken(order.id, serialNumber, sessionSecret);
      tokenHash = crypto.createHash('sha256').update(qrToken).digest('hex');
    }

    const qrCodeDataUrl = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280
    });
    await connection.execute(
      `INSERT INTO wallet_passes (order_id, serial_number, qr_token_hash, status, revoked_at)
       VALUES (?, ?, ?, 'issued', NULL)
       ON DUPLICATE KEY UPDATE serial_number = VALUES(serial_number),
         qr_token_hash = VALUES(qr_token_hash), status = 'issued',
         issued_at = CURRENT_TIMESTAMP, revoked_at = NULL`,
      [orderId, serialNumber, tokenHash]
    );
    return { orderCode: order.orderCode, serialNumber, qrToken, qrCodeDataUrl, status: order.status };
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
      qrCodeDataUrl: pass.qrCodeDataUrl,
      orderStatus: pass.status
    },
    note: 'El QR permanece igual mientras el pase siga vigente y se revoca al cancelar el pedido. El archivo Apple Wallet requiere certificados del comercio.'
  });
});

router.post('/passes/validate', requireSeller, async (req, res) => {
  const token = req.body && req.body.qrToken;
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
    return res.status(400).json({ error: 'El pase no es válido.' });
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [passes] = await pool.execute(
    `SELECT wp.serial_number AS serialNumber, wp.status AS passStatus,
            o.order_code AS orderCode, o.status AS orderStatus,
            o.seller_id AS sellerId
     FROM wallet_passes wp
     JOIN orders o ON o.id = wp.order_id
     WHERE wp.qr_token_hash = ? LIMIT 1`,
    [tokenHash]
  );
  if (!passes.length ||
      (passes[0].sellerId !== req.session.user.id && req.session.user.role !== 'admin') ||
      passes[0].passStatus !== 'issued' ||
      !['confirmed', 'ready'].includes(passes[0].orderStatus)) {
    return res.status(404).json({ error: 'El pase expiró o no es válido.' });
  }
  res.json({ valid: true, pass: passes[0] });
});

module.exports = router;
