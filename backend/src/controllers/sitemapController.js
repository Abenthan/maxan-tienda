const sitemapService = require("../services/sitemapService");

// Lo consume el bot de búsqueda en https://tienda.maxansistemas.com/sitemap.xml
// (nginx proxia esta ruta al backend). XML público, sin CORS problema: se
// sirve como documento, no como API.
async function sitemap(req, res, next) {
  try {
    const xml = await sitemapService.generarXml();
    res.set("Content-Type", "application/xml; charset=UTF-8");
    res.set("Cache-Control", "public, max-age=300");
    return res.send(xml);
  } catch (err) {
    next(err);
  }
}

module.exports = { sitemap };
