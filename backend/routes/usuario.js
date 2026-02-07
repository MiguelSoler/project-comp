const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { me, meEstancia, patchMe, deleteMe, changeMyPassword } = require("../controllers/usuarioController");

// GET /api/usuario/me
router.get("/me", auth.requireAuth, me);
// PATCH /api/usuario/me/
router.patch("/me", auth.requireAuth, patchMe);
// PATCH /api/usuario/me/password/
router.patch("/me/password", auth.requireAuth, changeMyPassword);
// GET /api/usuario/me/estancia
router.get("/me/estancia", auth.requireAuth, meEstancia);
// DELETE /api/usuario/me/
router.delete("/me", auth.requireAuth, deleteMe);


module.exports = router;
