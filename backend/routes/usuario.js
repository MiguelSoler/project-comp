const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { requireAuth, adminOrOwner, requireRole } = require('../middleware/authMiddleware');

// Solo admin puede ver todos los usuarios
router.get('/', requireAuth, requireRole('admin'), usuarioController.getAllUsuarios);

// Admin o dueño puede ver un usuario
router.get('/:id', requireAuth, adminOrOwner(), usuarioController.getUsuarioById);

// Registro (sin token)
router.post('/', usuarioController.createUsuarioHandler);

// Admin o dueño puede actualizar usuario
router.put('/:id', requireAuth, adminOrOwner(), usuarioController.updateUsuario);

// Admin o dueño puede borrar usuario
router.delete('/:id', requireAuth, adminOrOwner(), usuarioController.deleteUsuario);

module.exports = router;
