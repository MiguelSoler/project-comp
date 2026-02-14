// routes/piso.js

const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const { getAllPisos, getPisoById, getPisosByCiudad, createPiso, updatePiso, deletePiso } = require("../controllers/pisoController");

// Permite solo advertiser o admin
const requireAdvertiserOrAdmin = (req, res, next) => {
  if (req.user?.rol === "advertiser" || req.user?.rol === "admin") return next();
  return res.status(403).json({ error: "FORBIDDEN" });
};

// GET /api/piso
router.get("/", getAllPisos);

// GET /api/piso/ciudad/:ciudad  (⚠️ antes de "/:id")
router.get("/ciudad/:ciudad", getPisosByCiudad);

// GET /api/piso/:id
router.get("/:id", getPisoById);

// POST /api/piso  (solo advertiser o admin)
router.post("/", auth.requireAuth, requireAdvertiserOrAdmin, createPiso);

// PATCH /api/piso/:id (solo advertiser o admin; además, en controller validar admin o manager_usuario_id)
router.patch("/:id", auth.requireAuth, requireAdvertiserOrAdmin, updatePiso);

// DELETE /api/piso/:id (solo advertiser o admin; además, en controller validar admin o manager_usuario_id)
router.delete("/:id", auth.requireAuth, requireAdvertiserOrAdmin, deletePiso);

module.exports = router;
