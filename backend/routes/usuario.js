const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { me, meEstancia, patchMe, deleteMe } = require("../controllers/usuarioController");

// GET /api/usuario/me
router.get("/me", auth.requireAuth, me);
// GET /api/usuario/me/
router.patch("/me", auth.requireAuth, patchMe);
// DELETE /api/usuario/me/
router.delete("/me", auth.requireAuth, deleteMe);
// GET /api/usuario/me/estancia
router.get("/me/estancia", auth.requireAuth, meEstancia);

module.exports = router;
