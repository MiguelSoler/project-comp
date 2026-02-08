const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { listUsers, getUserById, patchUserById, changeUserPasswordById, deactivateUserById } = require("../controllers/adminUsuarioController");

// ======================================================
// ADMIN · Gestión de usuarios
// ======================================================
// GET /api/admin/usuario
router.get("/", auth.requireAuth, auth.requireAdmin, listUsers);
// GET /api/admin/usuario/:id
router.get("/:id", auth.requireAuth, auth.requireAdmin, getUserById);
// PATCH /api/admin/usuario/:id
router.patch("/:id", auth.requireAuth, auth.requireAdmin, patchUserById);
// PATCH /api/admin/usuario/:id/password
router.patch("/:id/password", auth.requireAuth, auth.requireAdmin, changeUserPasswordById);
// DELETE /api/admin/usuario/:id
router.delete("/:id", auth.requireAuth, auth.requireAdmin, deactivateUserById);


module.exports = router;
