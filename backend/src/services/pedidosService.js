const pedidosRepository = require("../repositories/pedidosRepository");
const catalogoRepository = require("../repositories/catalogoRepository");

// Valida y normaliza los items del carrito contra el catálogo: cada producto debe
// existir, estar activo y disponible (precio > 0 y, si es inventariable, stock > 0).
// El carrito manda solo { productoId, cantidad }; el precio y el nombre se
// recomponen desde la BD (nunca se confía en lo que envía el cliente).
async function validarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("El carrito está vacío");
    err.status = 400;
    throw err;
  }
  const vistos = new Set();
  const resultados = [];
  for (const it of items) {
    const productoId = Number(it.productoId);
    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(productoId) || productoId <= 0) {
      const err = new Error("Item con producto inválido");
      err.status = 400;
      throw err;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      const err = new Error("Cantidad inválida");
      err.status = 400;
      throw err;
    }
    if (vistos.has(productoId)) {
      const err = new Error("Producto duplicado en el carrito");
      err.status = 400;
      throw err;
    }
    vistos.add(productoId);

    const row = await catalogoRepository.obtenerPorId(productoId);
    if (!row || !row.activo) {
      const err = new Error(`Producto ${productoId} no está en el catálogo`);
      err.status = 400;
      throw err;
    }
    const disponible = Number(row.precio) > 0 && (!row.inventariable || Number(row.stock) > 0);
    if (!disponible) {
      const err = new Error(`"${row.nombre}" no está disponible`);
      err.status = 400;
      throw err;
    }
    const precio = Number(row.precio);
    const subtotal = precio * cantidad;
    resultados.push({
      productoId: Number(row.id),
      codigo: row.codigo,
      nombre: row.nombre,
      unidadMedida: row.unidad_medida,
      cantidad,
      precio,
      subtotal: Number(subtotal.toFixed(2)),
    });
  }
  return resultados;
}

function toCotizacion(row, items) {
  return {
    id: Number(row.id),
    estado: row.estado,
    observaciones: row.observaciones,
    createdAt: row.created_at,
    total: Number(row.total),
    items: (items || []).map((it) => ({
      id: Number(it.id),
      productoId: it.producto_id != null ? Number(it.producto_id) : null,
      codigo: it.codigo,
      nombre: it.nombre,
      unidadMedida: it.unidad_medida,
      cantidad: Number(it.cantidad),
      precio: Number(it.precio),
      subtotal: Number(it.subtotal),
    })),
  };
}

async function crear(usuarioId, { observaciones, items }) {
  const validados = await validarItems(items);
  const { id } = await pedidosRepository.crear({
    usuarioId,
    observaciones,
    items: validados,
  });
  return obtenerPorId(id, usuarioId);
}

async function listar(usuarioId) {
  const rows = await pedidosRepository.listarPorUsuario(usuarioId);
  return rows.map((r) => toCotizacion(r, []));
}

async function obtenerPorId(id, usuarioId) {
  const row = await pedidosRepository.obtenerPorId(id);
  if (!row || Number(row.usuario_id) !== Number(usuarioId)) return null;
  const items = await pedidosRepository.listarItems(id);
  return toCotizacion(row, items);
}

async function cancelar(id, usuarioId) {
  const row = await pedidosRepository.obtenerPorId(id);
  if (!row || Number(row.usuario_id) !== Number(usuarioId)) return null;
  if (row.estado !== "pendiente") {
    const err = new Error("Solo se pueden cancelar cotizaciones pendientes");
    err.status = 409;
    throw err;
  }
  const actualizada = await pedidosRepository.cancelar(id);
  if (!actualizada) {
    const err = new Error("No se pudo cancelar la cotización");
    err.status = 409;
    throw err;
  }
  const items = await pedidosRepository.listarItems(id);
  const refreshed = await pedidosRepository.obtenerPorId(id);
  return toCotizacion(refreshed, items);
}

module.exports = { crear, listar, obtenerPorId, cancelar };