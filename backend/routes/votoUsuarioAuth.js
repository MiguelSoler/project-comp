// backend/routes/votoUsuarioAuth.js

const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");

const {
  upsertVotoUsuario,
  listMisVotosEmitidos,
} = require("../controllers/votoUsuarioAuthController");

// Privado (usuario autenticado)
router.post("/", requireAuth, upsertVotoUsuario);
router.get("/mis-votos", requireAuth, listMisVotosEmitidos);

module.exports = router;
