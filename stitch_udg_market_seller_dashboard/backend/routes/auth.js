const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../db');
const {
  EMAIL_PATTERN,
  isNonEmptyString,
  normalizeEmail,
  normalizeOptionalString
} = require('../lib/validation');

const router = Router();

function saveLoginSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.user = { id: user.id, role: user.role };
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

router.get('/campuses', async (req, res) => {
  const [campuses] = await pool.execute('SELECT id, code, name FROM campuses ORDER BY name');
  res.json({ campuses });
});

router.post('/register', async (req, res) => {
  const {
    fullName,
    email: rawEmail,
    password,
    campusCode,
    studentCode,
    career,
    accountType,
    storeName
  } = req.body || {};
  const email = normalizeEmail(rawEmail);
  const normalizedStudentCode = typeof studentCode === 'string' ? studentCode.trim() : null;
  const normalizedCareer = normalizeOptionalString(career);

  if (
    !isNonEmptyString(fullName, 120) ||
    !EMAIL_PATTERN.test(email) ||
    typeof password !== 'string' ||
    password.length < 10 ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    !isNonEmptyString(campusCode, 20) ||
    !['buyer', 'seller'].includes(accountType)
  ) {
    return res.status(400).json({
      error: 'Revisa nombre, correo, contraseña (10 a 72 bytes), campus y tipo de cuenta.'
    });
  }
  if (normalizedStudentCode && normalizedStudentCode.length > 20) {
    return res.status(400).json({ error: 'El código de estudiante no es válido.' });
  }
  if (career != null &&
      (typeof career !== 'string' ||
        (normalizedCareer !== null && !isNonEmptyString(normalizedCareer, 120)))) {
    return res.status(400).json({ error: 'La carrera no es válida.' });
  }
  if (accountType === 'seller' && storeName != null && !isNonEmptyString(storeName, 120)) {
    return res.status(400).json({ error: 'El nombre de la tienda no es válido.' });
  }

  const [campuses] = await pool.execute('SELECT id FROM campuses WHERE code = ?', [
    campusCode.trim().toUpperCase()
  ]);
  if (!campuses.length) {
    return res.status(400).json({ error: 'Selecciona un campus disponible.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO users
        (campus_id, full_name, email, password_hash, student_code, career, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        campuses[0].id,
        fullName.trim(),
        email,
        passwordHash,
        normalizedStudentCode || null,
        normalizedCareer,
        accountType
      ]
    );
    await connection.execute('INSERT INTO user_preferences (user_id) VALUES (?)', [result.insertId]);
    if (accountType === 'seller') {
      await connection.execute(
        'INSERT INTO seller_profiles (user_id, store_name) VALUES (?, ?)',
        [result.insertId, storeName ? storeName.trim() : null]
      );
    }
    return { id: result.insertId, role: accountType };
  });

  await saveLoginSession(req, user);
  res.status(201).json({ user });
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const password = req.body && req.body.password;
  if (!EMAIL_PATTERN.test(email) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Ingresa un correo y contraseña válidos.' });
  }

  const [users] = await pool.execute(
    `SELECT id, password_hash, role, is_active
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  const user = users[0];
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  await saveLoginSession(req, user);
  res.json({ user: { id: user.id, role: user.role } });
});

router.get('/me', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });

  const [users] = await pool.execute(
    `SELECT u.id, u.full_name AS fullName, u.email, u.student_code AS studentCode,
            u.career, u.avatar_url AS avatarUrl, u.role, c.code AS campusCode,
            c.name AS campusName, sp.store_name AS storeName, sp.bio,
            sp.accepts_orders AS acceptsOrders
     FROM users u
     LEFT JOIN campuses c ON c.id = u.campus_id
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE u.id = ? AND u.is_active = TRUE`,
    [req.session.user.id]
  );
  if (!users.length) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'La cuenta ya no está disponible.' });
  }
  res.json({ user: users[0] });
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('udgmarket.sid');
    res.status(204).end();
  });
});

module.exports = router;
