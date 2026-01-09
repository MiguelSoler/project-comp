const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura';

// Verificar token
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        req.user = user; // { id, email, rol }
        next();
    });
};

// Verificar rol específico
exports.requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.rol !== role) {
            return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
        }
        next();
    };
};

// Permitir admin o dueño del recurso
exports.adminOrOwner = async (req, res, next) => {
    if (req.user.rol === 'admin') return next();

    const { id } = req.params;
    if (parseInt(id) !== req.user.id) {
        return res.status(403).json({ error: 'No puedes modificar o borrar a otros usuarios' });
    }

    next();
};
