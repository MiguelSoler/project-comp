const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getMe, getMeEstancia, updateMe, deleteMe, changeMePassword } = require("../controllers/usuarioController");

// ======================================================
// SELF · Endpoints del propio usuario autenticado (/me)
// ======================================================
// GET /api/usuario/me
router.get("/me", auth.requireAuth, getMe);
// PATCH /api/usuario/me
router.patch("/me", auth.requireAuth, updateMe);
// PATCH /api/usuario/me/password
router.patch("/me/password", auth.requireAuth, changeMePassword);
// GET /api/usuario/me/estancia
router.get("/me/estancia", auth.requireAuth, getMeEstancia);
// DELETE /api/usuario/me
router.delete("/me", auth.requireAuth, deleteMe);


module.exports = router;
