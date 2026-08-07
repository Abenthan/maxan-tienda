const express = require("express");
const router = express.Router();

// Fase 3: implementar con authenticate + authorizeRol("Cliente Tienda") + servicios
router.get("/", (req, res) => res.json([]));
router.post("/", (req, res) => res.status(501).json({ error: "No implementado" }));
router.get("/:id", (req, res) => res.status(404).json({ error: "No implementado" }));
router.post("/:id/cancelar", (req, res) => res.status(501).json({ error: "No implementado" }));

module.exports = router;
