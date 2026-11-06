const catalogoRepository = require("../repositories/catalogoRepository");

const PUBLIC_URL = process.env.PUBLIC_URL || "https://tienda.maxansistemas.com";

// El sitemap lo pide cada bot; la BD no cambia por minutos. Se genera una vez
// y se sirve en memoria durante 5 minutos.
const TTL_MS = 5 * 60 * 1000;
let cache = { xml: null, expira: 0 };

function fechaSitemap(fecha) {
  return new Date(fecha).toISOString().slice(0, 10);
}

/**
 * Sitemap XML del sitio: la raíz (todo el catálogo) y la ficha de cada
 * producto activo. lastmod real: la fecha de última modificación del producto
 * en la BD, no la hora del build.
 */
async function generarXml() {
  if (cache.xml && Date.now() < cache.expira) {
    return cache.xml;
  }

  const filas = await catalogoRepository.listarParaSitemap();

  const hoy = new Date();
  const ultimaModificacion = filas.length
    ? new Date(Math.max(...filas.map((r) => new Date(r.lastmod).getTime())))
    : hoy;

  const urls = [
    { ruta: "/", lastmod: ultimaModificacion, prioridad: "1.0" },
    ...filas.map((r) => ({
      ruta: `/producto/${r.id}`,
      lastmod: new Date(r.lastmod),
      prioridad: "0.8",
    })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${PUBLIC_URL}${u.ruta === "/" ? "" : u.ruta}</loc>\n` +
          `    <lastmod>${fechaSitemap(u.lastmod)}</lastmod>\n` +
          `    <changefreq>${u.ruta === "/" ? "weekly" : "weekly"}</changefreq>\n` +
          `    <priority>${u.prioridad}</priority>\n` +
          `  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  cache = { xml, expira: Date.now() + TTL_MS };
  return xml;
}

/** Regenera forzando la consulta (útil tras cambios del catálogo). */
function invalidar() {
  cache = { xml: null, expira: 0 };
}

module.exports = { generarXml, invalidar };
