const { Router } = require('express');
const { pool } = require('../db');
const { parseId } = require('../lib/validation');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/seller/:sellerId', async (req, res) => {
  const sellerId = parseId(req.params.sellerId);
  if (!sellerId) return res.status(400).json({ error: 'El vendedor no es válido.' });
  const [reviews] = await pool.execute(
    `SELECT r.id, r.rating, r.comment, r.created_at AS createdAt,
            u.full_name AS buyerName, oi.product_name_snapshot AS productName
     FROM reviews r
     JOIN users u ON u.id = r.buyer_id
     JOIN order_items oi ON oi.id = r.order_item_id
     WHERE r.seller_id = ?
     ORDER BY r.created_at DESC LIMIT 100`,
    [sellerId]
  );
  const [summary] = await pool.execute(
    `SELECT ROUND(AVG(rating), 1) AS averageRating, COUNT(*) AS reviewCount,
            COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS oneStarCount,
            COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS twoStarCount,
            COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS threeStarCount,
            COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS fourStarCount,
            COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS fiveStarCount
     FROM reviews WHERE seller_id = ?`,
    [sellerId]
  );
  res.json({ summary: summary[0], reviews });
});

router.post('/', requireAuth, async (req, res) => {
  const { orderItemId, rating, comment } = req.body || {};
  const itemId = parseId(orderItemId);
  if (!itemId || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      (comment != null && (typeof comment !== 'string' || comment.length > 250))) {
    return res.status(400).json({ error: 'Revisa la compra, la calificación (1 a 5) y el comentario.' });
  }

  const [items] = await pool.execute(
    `SELECT oi.id, o.buyer_id AS buyerId, o.seller_id AS sellerId, o.status
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.id = ?`,
    [itemId]
  );
  if (!items.length || items[0].buyerId !== req.session.user.id) {
    return res.status(404).json({ error: 'No se encontró esa compra.' });
  }
  if (items[0].status !== 'delivered') {
    return res.status(409).json({ error: 'Solo puedes reseñar compras entregadas.' });
  }

  const [result] = await pool.execute(
    `INSERT INTO reviews (order_item_id, buyer_id, seller_id, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [itemId, req.session.user.id, items[0].sellerId, rating, comment ? comment.trim() : null]
  );
  res.status(201).json({ review: { id: result.insertId, rating, comment: comment || null } });
});

module.exports = router;
