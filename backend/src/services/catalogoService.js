const catalogoRepository = require("../repositories/catalogoRepository");

// Presenta el catálogo con un shape estable para el frontend y calcula la
// disponibilidad: un producto se vende si tiene precio > 0 y, si es inventariable,
// hay stock > 0. La disponibilidad es informativa (nunca bloquea en el MVP).
function toProducto(row) {
  const precio = Number(row.precio);
  const stock = Number(row.stock);
  const inventariable = Boolean(row.inventariable);
  return {
    id: Number(row.id),
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria,
    unidadMedida: row.unidad_medida,
    inventariable,
    precio,
    destacado: Boolean(row.destacado),
    descripcion: row.descripcion,
    stock,
    disponible: precio > 0 && (!inventariable || stock > 0),
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

async function categorias() {
  return catalogoRepository.categorias();
}

module.exports = { listar, obtenerPorId, categorias };