const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const { getResumenVotosUsuario, listVotosRecibidosUsuario} = require("../controllers/votoUsuarioController");

// Protegido: solo usuarios autenticados con permiso real
router.get("/usuario/:usuarioId/resumen", requireAuth, getResumenVotosUsuario);
router.get("/usuario/:usuarioId/recibidos", requireAuth, listVotosRecibidosUsuario);

module.exports = router;