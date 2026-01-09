const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verifyToken, adminOrOwner, requireRole } = require('../middleware/authMiddleware');

// Solo admin puede ver todos los usuarios
router.get('/', verifyToken, requireRole('admin'), usuarioController.getAllUsuarios);

// Admin o dueño puede ver un usuario
router.get('/:id', verifyToken, adminOrOwner, usuarioController.getUsuarioById);

// Registro (sin token)
router.post('/', usuarioController.createUsuarioHandler);

// Admin o dueño puede actualizar usuario
router.put('/:id', verifyToken, adminOrOwner, usuarioController.updateUsuario);

// Admin o dueño puede borrar usuario
router.delete('/:id', verifyToken, adminOrOwner, usuarioController.deleteUsuario);

module.exports = router;
