// routes/piso.js

const express = require("express");
const router = express.Router();

const { getAllPisos, getPisoById, getPisosByCiudad, createPiso, updatePiso, deletePiso } = require("../controllers/pisoController");

// GET /api/piso
router.get("/", getAllPisos);

// GET /api/piso/ciudad/:ciudad  (ponerlo siempre antes de "/:id") - Es redundante pero igual en el futuro es útil para una UI más semántica
router.get("/ciudad/:ciudad", getPisosByCiudad);

// GET /api/piso/:id
router.get("/:id", getPisoById);


module.exports = router;
