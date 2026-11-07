import { useEffect } from 'react'

/** Origen público de la tienda. Se puede sobrescribir con VITE_SITE_URL. */
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://tienda.maxansistemas.com'
export const SITE_NAME = 'Tienda Maxan'
export const BRAND_NAME = 'Maxan Sistemas'

/** Versión de la tarjeta social: al cambiarla se invalida la caché de los crawlers. */
export const OG_IMAGE_VERSION = '20261023'

/** Imagen social por defecto (tarjeta 1200 × 630 JPG: los bots no leen WebP). */
export const OG_IMAGE = `${SITE_URL}/images/og-tienda.jpg?v=${OG_IMAGE_VERSION}`

/** Helper para apuntar la imagen social de cada ruta a su propia tarjeta. */
export const ogImage = (file: string): string => `${SITE_URL}/images/${file}`

const DEFAULT_TITLE = 'Catálogo de equipos, licencias y servicios | Tienda Maxan'
const DEFAULT_DESCRIPTION =
  'Explora el catálogo de Maxan Sistemas: equipos, licencias y servicios de tecnología para empresas en Colombia. Genera tu cotización en línea.'

type JsonLd = Record<string, unknown>

function setMeta(selector: string, attrs: Record<string, string>): void {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

function setCanonical(url: string): void {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    document.head.appendChild(el)
  }
  el.setAttribute('rel', 'canonical')
  el.setAttribute('href', url)
}

function removeCanonical(): void {
  document.head.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove())
}

export interface SeoOptions {
  title?: string
  description?: string
  /** Ruta con prefijo "/", p. ej. "/carrito". */
  path?: string
  /** URL absoluta de la imagen social. */
  image?: string
  /** Alt de la imagen social (og:image:alt). */
  imageAlt?: string
  /** Dimensiones de la imagen social (og:image:width/height). */
  imageWidth?: number
  imageHeight?: number
  /** Tipo de contenido Open Graph (p. ej. "product" si es un producto). */
  ogType?: string
  /** Objetos schema.org de la página. */
  jsonLd?: JsonLd[]
  /** Las páginas privadas (carrito, cotizaciones, 404) no se indexan. */
  noindex?: boolean
  /**
   * URL canónica absoluta. `null` elimina el canonical: se usa en estados de
   * producto inexistente y 404, donde apuntar a la URL inválida la haría
   * indexable. Por defecto se deriva de `path`.
   */
  canonical?: string | null
}

/**
 * Metadatos por ruta (SPA): title, description, canonical, Open Graph,
 * Twitter Card y JSON-LD específico de la página.
 *
 * Mismo contrato que `maxanSistemas.com/src/lib/seo.js`: el patrón de SEO
 * es compartido en el ecosistema y un componente migrado entre apps no cambia.
 */
export function useSeo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = OG_IMAGE,
  imageAlt,
  imageWidth,
  imageHeight,
  ogType = 'website',
  jsonLd = [],
  noindex = false,
  canonical = undefined,
}: SeoOptions = {}): void {
  // Se serializa el JSON-LD para depender de su contenido y no de la
  // identidad del array (evita re-ejecutar el efecto en cada render).
  const jsonLdKey = JSON.stringify(jsonLd)

  useEffect(() => {
    const url = `${SITE_URL}${path === '/' ? '' : path}`

    document.title = title

    setMeta('meta[name="description"]', { name: 'description', content: description })
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    setMeta('meta[property="og:url"]', { property: 'og:url', content: url })
    setMeta('meta[property="og:type"]', { property: 'og:type', content: ogType })
    setMeta('meta[property="og:image"]', { property: 'og:image', content: image })
    if (imageAlt) setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: imageAlt })
    if (imageWidth) {
      setMeta('meta[property="og:image:width"]', {
        property: 'og:image:width',
        content: String(imageWidth),
      })
    }
    if (imageHeight) {
      setMeta('meta[property="og:image:height"]', {
        property: 'og:image:height',
        content: String(imageHeight),
      })
    }
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })

    if (canonical === null) removeCanonical()
    else if (canonical) setCanonical(canonical)
    else setCanonical(url)

    document.querySelectorAll('script[data-seo-jsonld]').forEach((node) => node.remove())

    const datos: JsonLd[] = jsonLdKey ? JSON.parse(jsonLdKey) : []
    datos.forEach((data) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seoJsonld = 'true'
      script.textContent = JSON.stringify(data)
      document.head.appendChild(script)
    })
  }, [title, description, path, image, imageAlt, imageWidth, imageHeight, ogType, jsonLdKey, noindex, canonical])
}

/**
 * Completa `og:image:width/height` con las dimensiones reales de la imagen
 * del producto una vez el navegador las conoce (`naturalWidth/Height` al
 * terminar de cargar). Los bots que no ejecutan JS siguen leyendo los tags
 * estáticos; los que sí lo hacen obtienen dimensiones correctas.
 */
export function setOgImageSize(width: number, height: number): void {
  if (!width || !height) return
  setMeta('meta[property="og:image:width"]', {
    property: 'og:image:width',
    content: String(width),
  })
  setMeta('meta[property="og:image:height"]', {
    property: 'og:image:height',
    content: String(height),
  })
}

/** Grafo de navegación entre las páginas internas de la tienda. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export interface ProductoSeo {
  id: number
  nombre: string
  codigo: string | null
  descripcion: string | null
  imagenPrincipal: string | null
  precio: number
}

/** Ficha de producto para los resultados enriquecidos de Google. */
export function productJsonLd(producto: ProductoSeo): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    description: producto.descripcion || producto.nombre,
    image: producto.imagenPrincipal ? [producto.imagenPrincipal] : undefined,
    // sku real: el código del ERP (p. ej. "BLE-025"), no el id interno.
    sku: producto.codigo || String(producto.id),
    productID: producto.codigo ? `sku:${producto.codigo}` : undefined,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    // Un producto sin precio publicado no tiene oferta: emitir "0" sería un
    // dato estructurado inválido (el precio vive en WhatsApp como consulta).
    // Con precio siempre hay oferta "InStock": Maxan vende sin inventario
    // propio y el stock del ERP nunca bloquea la venta en la tienda.
    offers:
      producto.precio > 0
        ? {
            '@type': 'Offer',
            price: producto.precio.toFixed(0),
            priceCurrency: 'COP',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/producto/${producto.id}`,
            seller: { '@type': 'Organization', name: BRAND_NAME },
          }
        : undefined,
  }
}

/** Listado de productos del catálogo. */
export function itemListJsonLd(productos: { id: number; nombre: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: productos.length,
    itemListElement: productos.map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: p.nombre,
      url: `${SITE_URL}/producto/${p.id}`,
    })),
  }
}
