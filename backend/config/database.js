const mysql = require('mysql2/promise');

// Keep database settings in the backend .env file or set them in the environment.
// The target database must contain a compatible usuarios table.
const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2025',
    database: process.env.DB_NAME || 'udgmarket',
    port: Number(process.env.DB_PORT || 3306)
});

module.exports = dbPool;
