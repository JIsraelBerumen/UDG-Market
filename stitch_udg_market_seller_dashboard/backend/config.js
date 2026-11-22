const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sessionSecret = process.env.SESSION_SECRET || '';
if (sessionSecret.length < 32 || sessionSecret.includes('replace-with-')) {
  throw new Error('Configura SESSION_SECRET con al menos 32 caracteres aleatorios en .env.');
}

const imageMaxSizeMb = Number(process.env.IMAGE_MAX_SIZE_MB || 5);
if (!Number.isInteger(imageMaxSizeMb) || imageMaxSizeMb < 1 || imageMaxSizeMb > 20) {
  throw new Error('IMAGE_MAX_SIZE_MB debe ser un entero entre 1 y 20.');
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret,
  sessionMaxAgeMs: 1000 * 60 * 60 * 24 * 7,
  imageMaxSizeBytes: imageMaxSizeMb * 1024 * 1024,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'udgmarket_v2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  }
};
