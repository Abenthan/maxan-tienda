const express = require("express");
const { authenticate, authorizeRol } = require("../middleware/auth");
const controller = require("../controllers/pedidosController");

const router = express.Router();

// Solo clientes autenticados de la tienda (rol "Cliente Tienda").
router.use(authenticate, authorizeRol("Cliente Tienda"));

router.get("/", controller.listar);
router.post("/", controller.crear);
router.get("/:id", controller.obtener);
router.post("/:id/cancelar", controller.cancelar);

module.exports = router;