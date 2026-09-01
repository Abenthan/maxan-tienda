const pool = require("../config/db");

// Cotizaciones de los clientes de la tienda (schema `tienda`).
// El stock NUNCA se bloquea en el MVP: la disponibilidad es informativa y el
// asesor confirma la venta desde el ERP (la cotización nace en estado 'pendiente').

const SELECT_COTIZACION = `
  SELECT
    c.id,
    c.usuario_id,
    c.estado,
    c.observaciones,
    c.created_at,
    COALESCE(
      (SELECT SUM(ci.subtotal) FROM tienda.cotizaciones_items ci WHERE ci.cotizacion_id = c.id),
      0
    )::numeric AS total
  FROM tienda.cotizaciones c
`;

// Crea la cotización con su desglose de items en una transacción.
async function crear({ usuarioId, observaciones, items }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: [cotizacion],
    } = await client.query(
      `INSERT INTO tienda.cotizaciones (usuario_id, estado, observaciones)
       VALUES ($1, 'pendiente', $2)
       RETURNING id, usuario_id, estado, observaciones, created_at`,
      [usuarioId, observaciones || null]
    );
    for (const item of items) {
      await client.query(
        `INSERT INTO tienda.cotizaciones_items
           (cotizacion_id, producto_id, codigo, nombre, unidad_medida, cantidad, precio, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          cotizacion.id,
          item.productoId,
          item.codigo,
          item.nombre,
          item.unidadMedida,
          item.cantidad,
          item.precio,
          item.subtotal,
        ]
      );
    }
    await client.query("COMMIT");
    return cotizacion;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Lista las cotizaciones de un usuario, para la vista "mis cotizaciones".
async function listarPorUsuario(usuarioId) {
  const { rows } = await pool.query(
    `${SELECT_COTIZACION}
     WHERE c.usuario_id = $1
     ORDER BY c.created_at DESC`,
    [usuarioId]
  );
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await pool.query(
    `${SELECT_COTIZACION}
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listarItems(cotizacionId) {
  const { rows } = await pool.query(
    `SELECT id, producto_id, codigo, nombre, unidad_medida, cantidad, precio, subtotal
     FROM tienda.cotizaciones_items
     WHERE cotizacion_id = $1
     ORDER BY id`,
    [cotizacionId]
  );
  return rows;
}

// Solo cancela cotizaciones 'pendientes' (los items no bloquearon stock).
async function cancelar(id) {
  const { rows } = await pool.query(
    `UPDATE tienda.cotizaciones
     SET estado = 'cancelada'
     WHERE id = $1 AND estado = 'pendiente'
     RETURNING id, usuario_id, estado, observaciones, created_at`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { crear, listarPorUsuario, obtenerPorId, listarItems, cancelar };