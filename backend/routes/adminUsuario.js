const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const { uploadPerfilPhoto } = require("../middleware/uploadPerfilPhoto");
const { listUsers, getUserById, patchUserById, updateUserFotoById, deleteUserFotoById, changeUserPasswordById, deactivateUserById } = require("../controllers/adminUsuarioController");

// ======================================================
// ADMIN · Gestión de usuarios
// ======================================================
// GET /api/admin/usuario
router.get("/", requireAuth, requireAdmin, listUsers);

// GET /api/admin/usuario/:id
router.get("/:id", requireAuth, requireAdmin, getUserById);

// PATCH /api/admin/usuario/:id
router.patch("/:id", requireAuth, requireAdmin, patchUserById);

// PATCH /api/admin/usuario/:id/foto
router.patch(
  "/:id/foto",
  requireAuth,
  requireAdmin,
  uploadPerfilPhoto.single("foto"),
  updateUserFotoById
);

// DELETE /api/admin/usuario/:id/foto
router.delete("/:id/foto", requireAuth, requireAdmin, deleteUserFotoById);

// PATCH /api/admin/usuario/:id/password
router.patch("/:id/password", requireAuth, requireAdmin, changeUserPasswordById);

// DELETE /api/admin/usuario/:id
router.delete("/:id", requireAuth, requireAdmin, deactivateUserById);

module.exports = router;