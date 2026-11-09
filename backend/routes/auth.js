const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbPool = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_udg_market';

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Por favor completa todos los campos.' });
    }

    try {
        const [rows] = await dbPool.execute('SELECT * FROM usuarios WHERE correo = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo.' });
        }

        const user = rows[0];
        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.correo,
                nombre: user.nombre_completo,
                codigo: user.codigo_estudiante,
                campus: user.centro_universitario
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            message: 'Autenticación exitosa',
            token,
            user: {
                id: user.id,
                name: user.nombre_completo,
                email: user.correo,
                studentCode: user.codigo_estudiante,
                campus: user.centro_universitario,
                phone: user.telefono_whatsapp,
                isSeller: user.modo_vendedor,
                createdAt: user.creado_en
            }
        });
    } catch (error) {
        console.error('Error en Login:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/register', async (req, res) => {
    const { fullName, studentCode, campus, email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (![fullName, studentCode, campus, password].every(
        (value) => typeof value === 'string' && value.trim()
    ) || !normalizedEmail) {
        return res.status(400).json({ error: 'Por favor completa todos los campos.' });
    }

    if (!normalizedEmail.endsWith('@alumnos.udg.mx')) {
        return res.status(400).json({ error: 'El correo debe terminar forzosamente en @alumnos.udg.mx' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const [result] = await dbPool.execute(
            'INSERT INTO usuarios (nombre_completo, codigo_estudiante, centro_universitario, correo, password_hash) VALUES (?, ?, ?, ?, ?)',
            [fullName.trim(), studentCode.trim(), campus.trim(), normalizedEmail, passwordHash]
        );

        return res.status(201).json({ message: 'Usuario registrado correctamente', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El correo o código ya está registrado.' });
        }
        console.error('Error en Registro:', error);
        return res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

module.exports = router;
