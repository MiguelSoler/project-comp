const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { uploadPerfilPhoto } = require("../middleware/uploadPerfilPhoto");
const { getMe, getMeEstancia, updateMe, updateMeFoto, deleteMeFoto, deleteMe, changeMePassword } = require("../controllers/usuarioController");

// ======================================================
// SELF · Endpoints del propio usuario autenticado (/me)
// ======================================================
// GET /api/usuario/me
router.get("/me", auth.requireAuth, getMe);

// PATCH /api/usuario/me
router.patch("/me", auth.requireAuth, updateMe);

// PATCH /api/usuario/me/foto
router.patch(
  "/me/foto",
  auth.requireAuth,
  uploadPerfilPhoto.single("foto"),
  updateMeFoto
);

// DELETE /api/usuario/me/foto
router.delete("/me/foto", auth.requireAuth, deleteMeFoto);

// PATCH /api/usuario/me/password
router.patch("/me/password", auth.requireAuth, changeMePassword);

// GET /api/usuario/me/estancia
router.get("/me/estancia", auth.requireAuth, getMeEstancia);

// DELETE /api/usuario/me
router.delete("/me", auth.requireAuth, deleteMe);

module.exports = router;