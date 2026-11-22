const path = require('path');
const express = require('express');
const cors = require('cors');

// Resolve .env from the app root so startup does not depend on the shell's cwd.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());
// Restrict this to the deployed frontend origin in production.
app.use(cors());
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor de Backend UDG Market escuchando en http://localhost:${PORT}`);
});
