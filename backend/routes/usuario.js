const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { me, meEstancia } = require("../controllers/usuarioController");

// GET /api/usuario/me
router.get("/me", auth.requireAuth, me);

// GET /api/usuario/me/estancia
router.get("/me/estancia", auth.requireAuth, meEstancia);

module.exports = router;
