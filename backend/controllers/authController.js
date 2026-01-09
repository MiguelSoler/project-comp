const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura';
const usuarioController = require('./usuarioController');

exports.register = async (req, res) => {
    try {
        const { nombre, email, password, rol, telefono, limpieza, ruido, puntualidad_pagos } = req.body;

        // Comprobar si el email ya existe
        const existingUser = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Hashear la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Crear usuario usando usuarioController
        const usuario = await usuarioController.createUsuario({
            nombre,
            email,
            telefono,
            limpieza,
            ruido,
            puntualidad_pagos,
            password_hash: passwordHash,
            rol
        });

        // Generar JWT
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono, limpieza: usuario.limpieza, ruido: usuario.ruido, puntualidad_pagos: usuario.puntualidad_pagos, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            mensaje: 'Usuario registrado y logueado con éxito',
            usuario,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en el registro');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario por email
        const userResult = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const usuario = userResult.rows[0];

        // Comparar contraseña con el hash almacenado
        const match = await bcrypt.compare(password, usuario.password_hash);
        if (!match) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono, limpieza: usuario.limpieza, ruido: usuario.ruido, puntualidad_pagos: usuario.puntualidad_pagos, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            mensaje: 'Login exitoso',
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en el login');
    }
};

