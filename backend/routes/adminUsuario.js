const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const { listUsers, getUserById, patchUserById, changeUserPasswordById, deactivateUserById } = require("../controllers/adminUsuarioController");

// ======================================================
// ADMIN · Gestión de usuarios
// ======================================================
// GET /api/admin/usuario
router.get("/", requireAuth, requireAdmin, listUsers);
// GET /api/admin/usuario/:id
router.get("/:id", requireAuth, requireAdmin, getUserById);
// PATCH /api/admin/usuario/:id
router.patch("/:id", requireAuth, requireAdmin, patchUserById);
// PATCH /api/admin/usuario/:id/password
router.patch("/:id/password", requireAuth, requireAdmin, changeUserPasswordById);
// DELETE /api/admin/usuario/:id
router.delete("/:id", requireAuth, requireAdmin, deactivateUserById);


module.exports = router;
