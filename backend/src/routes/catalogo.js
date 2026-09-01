const express = require("express");
const controller = require("../controllers/catalogoController");

const router = express.Router();

router.get("/productos", controller.listar);
router.get("/productos/:id", controller.obtener);
router.get("/categorias", controller.categorias);

module.exports = router;