const config = require('./config');
const { pool } = require('./db');
const app = require('./app');

async function start() {
  await pool.query('SELECT 1 FROM users LIMIT 0');
  await pool.query('SELECT 1 FROM sessions LIMIT 0');
  const server = app.listen(config.port, () => {
    console.log(`UDG Market escuchando en http://localhost:${config.port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      app.locals.sessionStore.close();
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error(
    'No se pudo iniciar el backend. Verifica MySQL, ejecuta database/schema.sql y comprueba DB_DATABASE en .env y el entorno del sistema.',
    error
  );
  await pool.end();
  process.exitCode = 1;
});
