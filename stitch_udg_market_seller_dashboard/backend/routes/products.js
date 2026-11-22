const { Router } = require('express');
const { pool, withTransaction } = require('../db');
const {
  isNonEmptyString,
  isNumericInput,
  parseId,
  parsePrice,
  parseTags
} = require('../lib/validation');
const { requireAuth, requireSeller } = require('../middleware/auth');

const router = Router();

function parsePickupIds(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) return null;
  const ids = value.map(parseId);
  return ids.every(Boolean) && new Set(ids).size === ids.length ? ids : null;
}

function validImageUrl(value) {
  return value == null ||
    (isNonEmptyString(value, 2048) &&
      (value.startsWith('/imagenes/') || /^https?:\/\//i.test(value)));
}

function productFields(body, isCreate) {
  const fields = {};
  const errors = [];
  const mapping = [
    ['name', 'name', (value) => isNonEmptyString(value, 120) ? value.trim() : null],
    ['description', 'description', (value) =>
      value == null || (typeof value === 'string' && value.length <= 5000) ? value : null],
    ['ingredients', 'ingredients', (value) =>
      value == null || (typeof value === 'string' && value.length <= 2000) ? value : null],
    ['price', 'price', parsePrice],
    ['stock', 'stock', (value) =>
      isNumericInput(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100000
        ? Number(value)
        : null],
    ['categoryId', 'category_id', (value) => value == null ? null : parseId(value)],
    ['imageUrl', 'image_url', (value) => validImageUrl(value) ? value : null]
  ];

  for (const [input, column, parse] of mapping) {
    if (isCreate || Object.prototype.hasOwnProperty.call(body, input)) {
      const value = input === 'stock' && isCreate && body.stock === undefined ? 0 : body[input];
      const parsed = parse(value);
      if (parsed === null && !(input === 'description' && value == null) &&
          !(input === 'categoryId' && value == null) &&
          !(input === 'imageUrl' && value == null)) {
        errors.push(input);
      } else {
        fields[column] = parsed;
      }
    }
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') errors.push('isActive');
    else fields.is_active = body.isActive;
  }
  const tags = Object.prototype.hasOwnProperty.call(body, 'tags') ? parseTags(body.tags) : undefined;
  if (tags === null) errors.push('tags');
  const pickupLocationIds = Object.prototype.hasOwnProperty.call(body, 'pickupLocationIds')
    ? parsePickupIds(body.pickupLocationIds)
    : undefined;
  if (pickupLocationIds === null) errors.push('pickupLocationIds');

  return { fields, errors, tags, pickupLocationIds };
}

async function replaceTags(connection, productId, tags) {
  await connection.execute('DELETE FROM product_tag_assignments WHERE product_id = ?', [productId]);
  for (const tag of tags) {
    const [result] = await connection.execute(
      `INSERT INTO product_tags (name, tag_type) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [tag.name, tag.type]
    );
    await connection.execute(
      'INSERT INTO product_tag_assignments (product_id, tag_id) VALUES (?, ?)',
      [productId, result.insertId]
    );
  }
}

async function replacePickupLocations(connection, sellerId, productId, locationIds) {
  if (locationIds.length) {
    const placeholders = locationIds.map(() => '?').join(',');
    const [owned] = await connection.execute(
      `SELECT id FROM pickup_locations
       WHERE seller_id = ? AND is_active = TRUE AND id IN (${placeholders})`,
      [sellerId, ...locationIds]
    );
    if (owned.length !== locationIds.length) {
      const error = new Error('Selecciona puntos de entrega activos de tu tienda.');
      error.statusCode = 400;
      throw error;
    }
  }
  await connection.execute('DELETE FROM product_pickup_locations WHERE product_id = ?', [productId]);
  for (const locationId of locationIds) {
    await connection.execute(
      'INSERT INTO product_pickup_locations (product_id, pickup_location_id) VALUES (?, ?)',
      [productId, locationId]
    );
  }
}

async function assertCategoryExists(connection, categoryId) {
  if (categoryId == null) return;
  const [categories] = await connection.execute('SELECT id FROM categories WHERE id = ?', [categoryId]);
  if (!categories.length) {
    const error = new Error('La categoría seleccionada no existe.');
    error.statusCode = 400;
    throw error;
  }
}

async function listProductTags(productIds) {
  if (!productIds.length) return new Map();
  const placeholders = productIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT pta.product_id AS productId, pt.name, pt.tag_type AS type
     FROM product_tag_assignments pta
     JOIN product_tags pt ON pt.id = pta.tag_id
     WHERE pta.product_id IN (${placeholders})
     ORDER BY pt.tag_type, pt.name`,
    productIds
  );
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.productId)) grouped.set(row.productId, []);
    grouped.get(row.productId).push({ name: row.name, type: row.type });
  }
  return grouped;
}

function mapProduct(row, tags) {
  return {
    id: row.id,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    acceptsOrders: Boolean(row.acceptsOrders),
    campusCode: row.campusCode,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: row.stock,
    isActive: Boolean(row.isActive),
    autoPaused: Boolean(row.autoPaused),
    ingredients: row.ingredients,
    imageUrl: row.imageUrl,
    tags: tags.get(row.id) || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

const productSelect = `SELECT p.id, p.seller_id AS sellerId, u.full_name AS sellerName,
  sp.accepts_orders AS acceptsOrders,
  c.code AS campusCode, p.category_id AS categoryId, cat.name AS categoryName,
  p.name, p.description, p.price, p.stock, p.is_active AS isActive,
  p.auto_paused AS autoPaused, p.ingredients, p.image_url AS imageUrl,
  p.created_at AS createdAt, p.updated_at AS updatedAt
  FROM products p
  JOIN seller_profiles sp ON sp.user_id = p.seller_id
  JOIN users u ON u.id = sp.user_id
  LEFT JOIN campuses c ON c.id = u.campus_id
  LEFT JOIN categories cat ON cat.id = p.category_id`;

router.get('/', async (req, res) => {
  const conditions = [
    'p.is_active = TRUE',
    'p.stock > 0',
    'sp.accepts_orders = TRUE',
    'u.is_active = TRUE',
    `EXISTS (SELECT 1 FROM product_pickup_locations ppl
             JOIN pickup_locations pl ON pl.id = ppl.pickup_location_id
             WHERE ppl.product_id = p.id AND pl.is_active = TRUE)`
  ];
  const values = [];
  const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }
  const categoryId = req.query.categoryId ? parseId(req.query.categoryId) : null;
  if (req.query.categoryId && !categoryId) {
    return res.status(400).json({ error: 'La categoría no es válida.' });
  }
  if (categoryId) {
    conditions.push('p.category_id = ?');
    values.push(categoryId);
  }
  if (req.query.campusCode) {
    conditions.push('c.code = ?');
    values.push(String(req.query.campusCode).trim().toUpperCase());
  }

  const [rows] = await pool.execute(
    `${productSelect} WHERE ${conditions.join(' AND ')}
     ORDER BY p.created_at DESC LIMIT 100`,
    values
  );
  const tags = await listProductTags(rows.map((row) => row.id));
  res.json({ products: rows.map((row) => mapProduct(row, tags)) });
});

router.get('/mine', requireSeller, async (req, res) => {
  const [rows] = await pool.execute(
    `${productSelect} WHERE p.seller_id = ? ORDER BY p.updated_at DESC`,
    [req.session.user.id]
  );
  const tags = await listProductTags(rows.map((row) => row.id));
  res.json({ products: rows.map((row) => mapProduct(row, tags)) });
});

router.get('/categories', async (req, res) => {
  const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
  res.json({ categories });
});

router.get('/pickup-locations/mine', requireSeller, async (req, res) => {
  const [locations] = await pool.execute(
    `SELECT id, name, details, is_active AS isActive
     FROM pickup_locations WHERE seller_id = ? ORDER BY id`,
    [req.session.user.id]
  );
  res.json({ locations: locations.map((row) => ({ ...row, isActive: Boolean(row.isActive) })) });
});

router.post('/pickup-locations', requireSeller, async (req, res) => {
  const { name, details } = req.body || {};
  if (!isNonEmptyString(name, 120) ||
      (details != null && (typeof details !== 'string' || details.length > 255))) {
    return res.status(400).json({ error: 'Revisa el nombre y detalle del punto de entrega.' });
  }
  const locationId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      'INSERT INTO pickup_locations (seller_id, name, details) VALUES (?, ?, ?)',
      [req.session.user.id, name.trim(), details || null]
    );
    await connection.execute(
      `INSERT IGNORE INTO product_pickup_locations (product_id, pickup_location_id)
       SELECT id, ? FROM products WHERE seller_id = ?`,
      [result.insertId, req.session.user.id]
    );
    return result.insertId;
  });
  res.status(201).json({
    location: { id: locationId, name: name.trim(), details: details || null, isActive: true }
  });
});

router.patch('/pickup-locations/:id', requireSeller, async (req, res) => {
  const id = parseId(req.params.id);
  const { name, details, isActive } = req.body || {};
  if (!id) return res.status(400).json({ error: 'El punto de entrega no es válido.' });
  if (name !== undefined && !isNonEmptyString(name, 120)) {
    return res.status(400).json({ error: 'El nombre no es válido.' });
  }
  if (details !== undefined && details !== null &&
      (typeof details !== 'string' || details.length > 255)) {
    return res.status(400).json({ error: 'El detalle no es válido.' });
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive debe ser booleano.' });
  }
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (details !== undefined) { fields.push('details = ?'); values.push(details || null); }
  if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive); }
  if (!fields.length) return res.status(400).json({ error: 'No hay cambios para guardar.' });
  values.push(id, req.session.user.id);
  const [result] = await pool.execute(
    `UPDATE pickup_locations SET ${fields.join(', ')} WHERE id = ? AND seller_id = ?`,
    values
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el punto de entrega.' });
  res.json({ message: 'Punto de entrega actualizado.' });
});

router.post('/', requireSeller, async (req, res) => {
  const parsed = productFields(req.body || {}, true);
  if (parsed.errors.length) {
    return res.status(400).json({ error: 'Revisa los campos del producto.', fields: parsed.errors });
  }
  const sellerId = req.session.user.id;
  const fields = parsed.fields;
  const stock = fields.stock;
  const requestedActive = fields.is_active === undefined ? stock > 0 : fields.is_active;
  if (requestedActive && stock === 0) {
    return res.status(400).json({ error: 'No se puede activar un producto sin existencias.' });
  }
  const productId = await withTransaction(async (connection) => {
    await assertCategoryExists(connection, fields.category_id);
    const [result] = await connection.execute(
      `INSERT INTO products
        (seller_id, category_id, name, description, price, stock, is_active,
         auto_paused, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sellerId,
        fields.category_id ?? null,
        fields.name,
        fields.description ?? null,
        fields.price,
        stock,
        requestedActive,
        stock === 0 && requestedActive === false,
        fields.image_url ?? null
      ]
    );
    if (parsed.tags !== undefined) await replaceTags(connection, result.insertId, parsed.tags);
    const pickupLocationIds = parsed.pickupLocationIds === undefined
      ? (await connection.execute(
        'SELECT id FROM pickup_locations WHERE seller_id = ? AND is_active = TRUE',
        [sellerId]
      ))[0].map((row) => row.id)
      : parsed.pickupLocationIds;
    await replacePickupLocations(connection, sellerId, result.insertId, pickupLocationIds);
    return result.insertId;
  });
  res.status(201).json({ product: { id: productId } });
});

router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El producto no es válido.' });
  const [rows] = await pool.execute(`${productSelect} WHERE p.id = ? LIMIT 1`, [id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'No se encontró el producto.' });
  const isOwner = req.session.user &&
    (req.session.user.id === row.sellerId || req.session.user.role === 'admin');
  if (!isOwner && (!row.isActive || row.stock < 1 || !row.acceptsOrders)) {
    return res.status(404).json({ error: 'No se encontró el producto.' });
  }
  const tags = await listProductTags([id]);
  const [locations] = await pool.execute(
    `SELECT pl.id, pl.name, pl.details
     FROM product_pickup_locations ppl
     JOIN pickup_locations pl ON pl.id = ppl.pickup_location_id
     WHERE ppl.product_id = ? AND pl.is_active = TRUE ORDER BY pl.name`,
    [id]
  );
  res.json({
    product: {
      ...mapProduct(row, tags),
      pickupLocations: locations
    }
  });
});

router.patch('/:id/stock', requireSeller, async (req, res) => {
  const productId = parseId(req.params.id);
  const stock = req.body && req.body.stock;
  if (!productId || !isNumericInput(stock) || !Number.isSafeInteger(Number(stock)) ||
      Number(stock) < 0 || Number(stock) > 100000) {
    return res.status(400).json({ error: 'El stock debe ser un entero entre 0 y 100000.' });
  }
  const updated = await withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT stock, is_active AS isActive, auto_paused AS autoPaused
       FROM products WHERE id = ? AND seller_id = ? FOR UPDATE`,
      [productId, req.session.user.id]
    );
    if (!rows.length) return null;
    const previous = rows[0];
    let active = Boolean(previous.isActive);
    let autoPaused = Boolean(previous.autoPaused);
    if (Number(stock) === 0) {
      if (active) autoPaused = true;
      active = false;
    } else if (autoPaused) {
      active = true;
      autoPaused = false;
    }
    await connection.execute(
      'UPDATE products SET stock = ?, is_active = ?, auto_paused = ? WHERE id = ?',
      [Number(stock), active, autoPaused, productId]
    );
    return { stock: Number(stock), isActive: active, autoPaused };
  });
  if (!updated) return res.status(404).json({ error: 'No se encontró el producto.' });
  res.json({ product: { id: productId, ...updated } });
});

router.patch('/:id', requireSeller, async (req, res) => {
  const productId = parseId(req.params.id);
  if (!productId) return res.status(400).json({ error: 'El producto no es válido.' });
  const parsed = productFields(req.body || {}, false);
  if (parsed.errors.length) {
    return res.status(400).json({ error: 'Revisa los campos del producto.', fields: parsed.errors });
  }
  if (!Object.keys(parsed.fields).length && parsed.tags === undefined &&
      parsed.pickupLocationIds === undefined) {
    return res.status(400).json({ error: 'No hay cambios para guardar.' });
  }

  const updated = await withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT stock, is_active AS isActive, auto_paused AS autoPaused
       FROM products WHERE id = ? AND seller_id = ? FOR UPDATE`,
      [productId, req.session.user.id]
    );
    if (!rows.length) return false;
    const previous = rows[0];
    const fields = { ...parsed.fields };
    if (Object.prototype.hasOwnProperty.call(fields, 'category_id')) {
      await assertCategoryExists(connection, fields.category_id);
    }
    const stock = fields.stock === undefined ? previous.stock : fields.stock;
    let active = fields.is_active === undefined ? Boolean(previous.isActive) : fields.is_active;
    let autoPaused = Boolean(previous.autoPaused);

    if (fields.is_active === false) {
      active = false;
      autoPaused = false;
    } else if (stock === 0) {
      if (active) autoPaused = true;
      active = false;
    } else if (fields.is_active === true) {
      active = true;
      autoPaused = false;
    } else if (autoPaused) {
      active = true;
      autoPaused = false;
    }
    if (fields.is_active === true && stock === 0) {
      const error = new Error('No se puede activar un producto sin existencias.');
      error.statusCode = 400;
      throw error;
    }

    fields.is_active = active;
    fields.auto_paused = autoPaused;
    const columns = Object.keys(fields);
    if (columns.length) {
      await connection.execute(
        `UPDATE products SET ${columns.map((column) => `${column} = ?`).join(', ')}
         WHERE id = ? AND seller_id = ?`,
        [...columns.map((column) => fields[column]), productId, req.session.user.id]
      );
    }
    if (parsed.tags !== undefined) await replaceTags(connection, productId, parsed.tags);
    if (parsed.pickupLocationIds !== undefined) {
      await replacePickupLocations(connection, req.session.user.id, productId, parsed.pickupLocationIds);
    }
    return true;
  });
  if (!updated) return res.status(404).json({ error: 'No se encontró el producto.' });
  res.json({ message: 'Producto actualizado.' });
});

router.delete('/:id', requireSeller, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'El producto no es válido.' });
  const [result] = await pool.execute(
    `UPDATE products SET is_active = FALSE, auto_paused = FALSE
     WHERE id = ? AND seller_id = ?`,
    [id, req.session.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el producto.' });
  res.status(204).end();
});

module.exports = router;
