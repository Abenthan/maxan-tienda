const pool = require("../config/db");

// Productos en venta (tienda.productos_venta activos) + datos del ERP.
// El ERP es la única fuente de verdad de productos; la tienda solo administra
// precio y visibilidad. Maxan vende sin inventario propio: no se consulta
// stock (la disponibilidad depende solo del precio publicado).
const SELECT_PRODUCTOS = `
  SELECT
    p.id,
    p.codigo,
    p.nombre,
    p.categoria,
    p.unidad_medida,
    pv.precio,
    pv.destacado,
    pv.descripcion,
    pv.activo,
    img.url AS imagen_principal
  FROM tienda.productos_venta pv
  JOIN inventario.productos p ON p.id = pv.producto_id
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
     WHERE p.id = $1 AND pv.activo = TRUE`,
    [id]
  );
  return rows[0] || null;
}

// Comprobación ligera para nginx (auth_request): ¿existe y está activo el
// producto? No carga imágenes ni stock: solo decide si la ficha es indexable.
// Se usa en GET /api/catalogo/productos/:id/existe (200 = sí, 403 = no).
async function existe(id) {
  const { rows } = await pool.query(
    `SELECT EXISTS(
       SELECT 1
       FROM tienda.productos_venta pv
       JOIN inventario.productos p ON p.id = pv.producto_id
       WHERE p.id = $1 AND pv.activo = TRUE
     ) AS existe`,
    [id]
  );
  return Boolean(rows[0]?.existe);
}

// Filas para el sitemap: id y última modificación real (fecha mayor entre el
// producto del ERP y su registro de venta). Solo productos activos.
async function listarParaSitemap() {
  const { rows } = await pool.query(
    `SELECT pv.producto_id AS id,
            GREATEST(pv.updated_at, p.updated_at) AS lastmod
       FROM tienda.productos_venta pv
       JOIN inventario.productos p ON p.id = pv.producto_id
      WHERE pv.activo = TRUE
      ORDER BY pv.producto_id`
  );
  return rows;
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

module.exports = { listar, obtenerPorId, existe, listarParaSitemap, obtenerImagenes, categorias };