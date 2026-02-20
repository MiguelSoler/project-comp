// backend/routes/habitacion.js

const express = require("express");
const router = express.Router();

const { listHabitaciones, listHabitacionesByPiso, getHabitacionById, listFotosHabitacion } = require("../controllers/habitacionController");

// Público
router.get("/", listHabitaciones);
router.get("/piso/:pisoId", listHabitacionesByPiso);
router.get("/:habitacionId", getHabitacionById);
router.get("/:habitacionId/fotos", listFotosHabitacion);

module.exports = router;
