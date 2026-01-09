const express = require('express');
const router = express.Router();
const usuarioPisoController = require('../controllers/usuarioPisoController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, usuarioPisoController.getAllUsuarioPiso);
router.get('/:id', verifyToken, usuarioPisoController.getUsuarioPisoById);

// Unirse a un piso (requiere login)
router.post('/', verifyToken, usuarioPisoController.createUsuarioPiso);

// Actualizar relación (solo admin)
router.put('/:id', verifyToken, usuarioPisoController.updateUsuarioPiso);

// Eliminar relación (solo admin)
router.delete('/:id', verifyToken, usuarioPisoController.deleteUsuarioPiso);

module.exports = router;
