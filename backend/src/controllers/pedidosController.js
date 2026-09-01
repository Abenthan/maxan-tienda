const pedidosService = require("../services/pedidosService");

// Crea una cotización a partir del carrito (estado 'pendiente').
async function crear(req, res, next) {
  try {
    const { observaciones, items } = req.body || {};
    const cotizacion = await pedidosService.crear(req.user.id, { observaciones, items });
    res.status(201).json(cotizacion);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const cotizaciones = await pedidosService.listar(req.user.id);
    res.json(cotizaciones);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de cotización inválido" });
    }
    const cotizacion = await pedidosService.obtenerPorId(id, req.user.id);
    if (!cotizacion) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }
    res.json(cotizacion);
  } catch (err) {
    next(err);
  }
}

async function cancelar(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID de cotización inválido" });
    }
    const cotizacion = await pedidosService.cancelar(id, req.user.id);
    if (!cotizacion) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }
    res.json(cotizacion);
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listar, obtener, cancelar };