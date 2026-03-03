// backend/routes/adminPiso.js

const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");

const { listPisosAdmin, getPisoAdminById, listHabitacionesAdminByPiso, createPiso, updatePiso, deletePiso, addFotoPiso, updateFotoPiso, deleteFotoPiso } = require("../controllers/adminPisoController");

// Privado (admin o manager del piso; se valida en controller)
router.get("/", requireAuth, listPisosAdmin);
router.get("/:pisoId", requireAuth, getPisoAdminById);
router.get("/:pisoId/habitaciones", requireAuth, listHabitacionesAdminByPiso);
router.post("/", requireAuth, createPiso);
router.patch("/:pisoId", requireAuth, updatePiso);
router.delete("/:pisoId/:id", requireAuth, deletePiso);

// Fotos de piso
router.post("/:pisoId/fotos", requireAuth, addFotoPiso);
router.patch("/:pisoId/fotos/:fotoId", requireAuth, updateFotoPiso);
router.delete("/:pisoId/fotos/:fotoId", requireAuth, deleteFotoPiso);

module.exports = router;