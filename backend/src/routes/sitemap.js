const express = require("express");
const controller = require("../controllers/sitemapController");

const router = express.Router();

// Sirve la raíz del dominio: nginx hace proxy de = /sitemap.xml aquí.
router.get("/sitemap.xml", controller.sitemap);

module.exports = router;
