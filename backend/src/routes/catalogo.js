const express = require("express");
const router = express.Router();

// Fase 3: implementar con servicios + repositorio (catálogo del ERP + precios tienda + disponibilidad)
router.get("/productos", (req, res) => res.json([]));
router.get("/productos/:id", (req, res) => res.status(404).json({ error: "No implementado" }));
router.get("/categorias", (req, res) => res.json([]));

module.exports = router;
