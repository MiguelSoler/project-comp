// backend/routes/adminHabitacion.js

const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");

const { createHabitacion, updateHabitacion, deactivateHabitacion, addFotoHabitacion, updateFotoHabitacion, deleteFotoHabitacion } = require("../controllers/adminHabitacionController");

// Privado (admin o manager del piso)
router.post("/", requireAuth, createHabitacion);
router.patch("/:habitacionId", requireAuth, updateHabitacion);
router.delete("/:habitacionId/deactivate", requireAuth, deactivateHabitacion);

router.post("/:habitacionId/fotos", requireAuth, addFotoHabitacion);
router.patch("/:habitacionId/fotos/:fotoId", requireAuth, updateFotoHabitacion);
router.delete("/:habitacionId/fotos/:fotoId", requireAuth, deleteFotoHabitacion);

module.exports = router;
