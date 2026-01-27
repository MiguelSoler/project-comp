const express = require('express');
const router = express.Router();
const usuarioPisoController = require('../controllers/usuarioPisoController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, usuarioPisoController.getAllUsuarioPiso);
router.get('/:id', requireAuth, usuarioPisoController.getUsuarioPisoById);

// Unirse a un piso (requiere login)
router.post('/', requireAuth, usuarioPisoController.createUsuarioPiso);

// Actualizar relación (solo admin)
router.put('/:id', requireAuth, usuarioPisoController.updateUsuarioPiso);

// Eliminar relación (solo admin)
router.delete('/:id', requireAuth, usuarioPisoController.deleteUsuarioPiso);

module.exports = router;
