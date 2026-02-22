// backend/routes/votoUsuario.js

const express = require("express");
const router = express.Router();

const { getResumenVotosUsuario, listVotosRecibidosUsuario } = require("../controllers/votoUsuarioController");

// Público
router.get("/usuario/:usuarioId/resumen", getResumenVotosUsuario);
router.get("/usuario/:usuarioId/recibidos", listVotosRecibidosUsuario);

module.exports = router;
