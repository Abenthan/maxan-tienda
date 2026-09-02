const pool = require("../config/db");

// Productos en venta (tienda.productos_venta activos) + datos del ERP + stock informativo.
// El ERP es la única fuente de verdad de productos/inventario; la tienda solo administra
// precio y visibilidad. El stock se obtiene de la vista compartida de inventario.
const SELECT_PRODUCTOS = `
  SELECT
    p.id,
    p.codigo,
    p.nombre,
    p.categoria,
    p.inventariable,
    p.unidad_medida,
    pv.precio,
    pv.destacado,
    pv.descripcion,
    pv.activo,
    COALESCE(vs.stock_actual, 0)::numeric AS stock,
    img.url AS imagen_principal
  FROM tienda.productos_venta pv
  JOIN inventario.productos p ON p.id = pv.producto_id
  LEFT JOIN inventario.vw_stock_disponible vs ON vs.producto_id = p.id
  LEFT JOIN LATERAL (
    SELECT url FROM inventario.imagenes
    WHERE producto_id = p.id AND es_principal = TRUE
    LIMIT 1
  ) img ON TRUE
`;

async function listar() {
  const { rows } = await pool.query(
    `${SELECT_PRODUCTOS}
     WHERE pv.activo = TRUE
     ORDER BY p.nombre`
  );
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await pool.query(
    `${SELECT_PRODUCTOS}
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function obtenerImagenes(productoId) {
  const { rows } = await pool.query(
    `SELECT id, url, es_principal, orden
     FROM inventario.imagenes
     WHERE producto_id = $1
     ORDER BY es_principal DESC, orden ASC`,
    [productoId]
  );
  return rows;
}

async function categorias() {
  const { rows } = await pool.query(
    `SELECT DISTINCT categoria
     FROM inventario.productos
     WHERE categoria IS NOT NULL AND categoria <> ''
     ORDER BY categoria`
  );
  return rows.map((r) => r.categoria);
}

module.exports = { listar, obtenerPorId, obtenerImagenes, categorias };