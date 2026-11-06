const catalogoService = require("../services/catalogoService");

async function listar(req, res, next) {
  try {
    const productos = await catalogoService.listar();
    res.json(productos);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de producto inválido" });
    }
    const producto = await catalogoService.obtenerPorId(id);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(producto);
  } catch (err) {
    next(err);
  }
}

// Nginx usa este endpoint como subpetición de `auth_request` para decidir si
// /producto/:id existe. Devuelve 200 (existe) o 403 (no existe): auth_request
// solo permite 2xx y propaga 403, que nginx convierte en 404 con el body de la
// SPA. No es un endpoint de negocio para el frontend.
async function existe(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(403).json({ existe: false });
    }
    const ok = await catalogoService.existe(id);
    return res.status(ok ? 200 : 403).json({ existe: ok });
  } catch (err) {
    next(err);
  }
}

async function categorias(req, res, next) {
  try {
    const categorias = await catalogoService.categorias();
    res.json(categorias);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, existe, categorias };