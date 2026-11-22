const { Router } = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const multer = require('multer');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = Router();
const extensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(__dirname, '..', '..', 'imagenes'),
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomBytes(16).toString('hex')}${extensions.get(file.mimetype)}`);
    }
  }),
  limits: { fileSize: config.imageMaxSizeBytes, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!extensions.has(file.mimetype)) {
      return callback(new Error('Tipo de archivo no permitido.'));
    }
    callback(null, true);
  }
});

router.post('/images', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Selecciona una imagen JPG, PNG o WebP.' });
  res.status(201).json({
    image: {
      url: `/imagenes/${req.file.filename}`,
      contentType: req.file.mimetype,
      size: req.file.size
    }
  });
});

module.exports = router;
