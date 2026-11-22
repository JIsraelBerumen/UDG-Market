const { Router } = require('express');
const { pool, withTransaction } = require('../db');
const { isNonEmptyString } = require('../lib/validation');
const { requireAuth, requireSeller } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.full_name AS fullName, u.email, u.student_code AS studentCode,
            u.career, u.avatar_url AS avatarUrl, u.role, c.code AS campusCode,
            c.name AS campusName, p.order_notifications AS orderNotifications,
            p.review_notifications AS reviewNotifications,
            sp.store_name AS storeName, sp.bio, sp.accepts_orders AS acceptsOrders
     FROM users u
     LEFT JOIN campuses c ON c.id = u.campus_id
     LEFT JOIN user_preferences p ON p.user_id = u.id
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE u.id = ?`,
    [req.session.user.id]
  );
  res.json({ profile: rows[0] });
});

router.patch('/', requireAuth, async (req, res) => {
  const body = req.body || {};
  const userId = req.session.user.id;
  const userFields = {};
  const sellerFields = {};

  if (body.fullName !== undefined) {
    if (!isNonEmptyString(body.fullName, 120)) {
      return res.status(400).json({ error: 'El nombre no es válido.' });
    }
    userFields.full_name = body.fullName.trim();
  }
  if (body.career !== undefined) {
    if (body.career !== null && !isNonEmptyString(body.career, 120)) {
      return res.status(400).json({ error: 'La carrera no es válida.' });
    }
    userFields.career = body.career ? body.career.trim() : null;
  }
  if (body.studentCode !== undefined) {
    if (
      body.studentCode !== null &&
      (typeof body.studentCode !== 'string' ||
        (body.studentCode.trim().length > 0 &&
          !/^[A-Za-z0-9-]{1,20}$/.test(body.studentCode.trim())))
    ) {
      return res.status(400).json({ error: 'El código de estudiante no es válido.' });
    }
    userFields.student_code = body.studentCode && body.studentCode.trim()
      ? body.studentCode.trim()
      : null;
  }
  if (body.campusCode !== undefined) {
    if (body.campusCode !== null && typeof body.campusCode !== 'string') {
      return res.status(400).json({ error: 'El campus no es válido.' });
    }
    const campusCode = body.campusCode ? body.campusCode.trim().toUpperCase() : '';
    if (campusCode) {
      const [campuses] = await pool.execute('SELECT id FROM campuses WHERE code = ?', [campusCode]);
      if (!campuses.length) {
        return res.status(400).json({ error: 'Selecciona un campus disponible.' });
      }
      userFields.campus_id = campuses[0].id;
    } else {
      userFields.campus_id = null;
    }
  }
  if (body.avatarUrl !== undefined) {
    if (
      body.avatarUrl !== null &&
      (!isNonEmptyString(body.avatarUrl, 2048) ||
        (!body.avatarUrl.startsWith('/imagenes/') && !/^https?:\/\//i.test(body.avatarUrl)))
    ) {
      return res.status(400).json({ error: 'La URL del avatar no es válida.' });
    }
    userFields.avatar_url = body.avatarUrl || null;
  }

  const sellerAccount = ['seller', 'both', 'admin'].includes(req.session.user.role);
  if (body.storeName !== undefined || body.bio !== undefined || body.acceptsOrders !== undefined) {
    if (!sellerAccount) {
      return res.status(403).json({ error: 'Esta cuenta no tiene perfil de vendedor.' });
    }
    if (body.storeName !== undefined) {
      if (body.storeName !== null && !isNonEmptyString(body.storeName, 120)) {
        return res.status(400).json({ error: 'El nombre de la tienda no es válido.' });
      }
      sellerFields.store_name = body.storeName ? body.storeName.trim() : null;
    }
    if (body.bio !== undefined) {
      if (body.bio !== null && (typeof body.bio !== 'string' || body.bio.length > 2000)) {
        return res.status(400).json({ error: 'La descripción supera los 2000 caracteres.' });
      }
      sellerFields.bio = body.bio || null;
    }
    if (body.acceptsOrders !== undefined) {
      if (typeof body.acceptsOrders !== 'boolean') {
        return res.status(400).json({ error: 'acceptsOrders debe ser booleano.' });
      }
      sellerFields.accepts_orders = body.acceptsOrders;
    }
  }

  const preferences = {};
  for (const field of ['orderNotifications', 'reviewNotifications']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'boolean') {
        return res.status(400).json({ error: `${field} debe ser booleano.` });
      }
      preferences[field === 'orderNotifications' ? 'order_notifications' : 'review_notifications'] =
        body[field];
    }
  }

  try {
    await withTransaction(async (connection) => {
      for (const [field, value] of Object.entries(userFields)) {
        await connection.execute(`UPDATE users SET ${field} = ? WHERE id = ?`, [value, userId]);
      }
      for (const [field, value] of Object.entries(sellerFields)) {
        await connection.execute(`UPDATE seller_profiles SET ${field} = ? WHERE user_id = ?`, [
          value,
          userId
        ]);
      }
      for (const [field, value] of Object.entries(preferences)) {
        await connection.execute(
          `INSERT INTO user_preferences (user_id, ${field}) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE ${field} = VALUES(${field})`,
          [userId, value]
        );
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' && userFields.student_code) {
      return res.status(409).json({ error: 'Ese código de estudiante ya está registrado.' });
    }
    throw error;
  }
  res.json({ message: 'Perfil actualizado.' });
});

router.get('/seller/:sellerId', async (req, res) => {
  const sellerId = Number(req.params.sellerId);
  if (!Number.isSafeInteger(sellerId) || sellerId < 1) {
    return res.status(400).json({ error: 'El vendedor no es válido.' });
  }
  const [rows] = await pool.execute(
    `SELECT u.id, u.full_name AS fullName, u.avatar_url AS avatarUrl,
            c.code AS campusCode, c.name AS campusName,
            sp.store_name AS storeName, sp.bio,
            ROUND(AVG(r.rating), 1) AS averageRating, COUNT(r.id) AS reviewCount
     FROM seller_profiles sp
     JOIN users u ON u.id = sp.user_id
     LEFT JOIN campuses c ON c.id = u.campus_id
     LEFT JOIN reviews r ON r.seller_id = sp.user_id
     WHERE sp.user_id = ? AND u.is_active = TRUE
     GROUP BY u.id, u.full_name, u.avatar_url, c.code, c.name, sp.store_name, sp.bio`,
    [sellerId]
  );
  if (!rows.length) return res.status(404).json({ error: 'No se encontró al vendedor.' });
  res.json({ seller: rows[0] });
});

router.patch('/seller/orders', requireSeller, async (req, res) => {
  const { acceptsOrders } = req.body || {};
  if (typeof acceptsOrders !== 'boolean') {
    return res.status(400).json({ error: 'acceptsOrders debe ser booleano.' });
  }
  await pool.execute('UPDATE seller_profiles SET accepts_orders = ? WHERE user_id = ?', [
    acceptsOrders,
    req.session.user.id
  ]);
  res.json({ acceptsOrders });
});

module.exports = router;
