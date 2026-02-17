const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { joinHabitacion, leaveHabitacion, kickFromHabitacion, getMyStay, getConvivientesByPiso } = require("../controllers/usuarioHabitacionController");

// Todas requieren login
router.post("/join", requireAuth, joinHabitacion);
router.patch("/leave", requireAuth, leaveHabitacion);
router.patch("/kick/:usuarioHabitacionId", requireAuth, kickFromHabitacion);

router.get("/my", requireAuth, getMyStay);
router.get("/piso/:pisoId/convivientes", requireAuth, getConvivientesByPiso);

module.exports = router;
