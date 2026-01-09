const express = require('express');
const router = express.Router();
const pisoController = require('../controllers/pisoController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', pisoController.getAllPisos);
router.get('/:id', pisoController.getPisoById);
router.get('/ciudad/:ciudad', pisoController.getPisosByCiudad);

// Crear piso (requiere login)
router.post('/', verifyToken, pisoController.createPiso);

// Actualizar y borrar piso (solo admin o dueño)
router.put('/:id', verifyToken, pisoController.updatePiso);
router.delete('/:id', verifyToken, pisoController.deletePiso);

module.exports = router;
