const catalogoRepository = require("../repositories/catalogoRepository");

// Presenta el catálogo con un shape estable para el frontend. Maxan vende sin
// inventario propio: la disponibilidad depende solo del precio publicado
// (precio > 0); el stock del ERP no participa y la tienda ya no lo expone.
function toProducto(row) {
  const precio = Number(row.precio);
  return {
    id: Number(row.id),
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria,
    unidadMedida: row.unidad_medida,
    precio,
    destacado: Boolean(row.destacado),
    descripcion: row.descripcion,
    disponible: precio > 0,
    imagenPrincipal: row.imagen_principal || null,
  };
}

async function listar() {
  const rows = await catalogoRepository.listar();
  return rows.map(toProducto);
}

async function obtenerPorId(id) {
  const row = await catalogoRepository.obtenerPorId(id);
  if (!row) return null;
  const producto = toProducto(row);
  // Cargar todas las imágenes para el detalle
  const imagenes = await catalogoRepository.obtenerImagenes(id);
  producto.imagenes = imagenes.map((img) => ({
    url: img.url,
    esPrincipal: img.es_principal,
    orden: img.orden,
  }));
  return producto;
}

async function existe(id) {
  return catalogoRepository.existe(id);
}

async function categorias() {
  return catalogoRepository.categorias();
}

module.exports = { listar, obtenerPorId, existe, categorias };