import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { fetchProductos, fetchCategorias, type Producto, type Categoria } from '../lib/api'
import { itemListJsonLd, useSeo } from '../lib/seo'

/** Ordenes disponibles. 'relevancia' conserva el orden del catálogo (destacados del ERP primero). */
const ORDENES = [
  { value: 'relevancia', label: 'Relevancia' },
  { value: 'nombre', label: 'Nombre A–Z' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
] as const

type Orden = (typeof ORDENES)[number]['value']

function esOrden(valor: string | null): valor is Orden {
  return ORDENES.some((o) => o.value === valor)
}

/** Busca ignorando mayúsculas, tildes y signos de puntuación suave. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function Catalogo() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Búsqueda y filtros viven en la URL (`/?:q=&cat=&orden=`): se restauran sin
  // recarga, sobreviven back/forward y se pueden compartir.
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const categoriaParam = searchParams.get('cat') ?? 'todas'
  const ordenParam = searchParams.get('orden')
  const orden: Orden = esOrden(ordenParam) ? ordenParam : 'relevancia'

  // Categoría inválida (enlace editado a mano) se lee como "todas" sin tocar la URL.
  const categoria: Categoria | 'todas' =
    categoriaParam === 'todas' || categorias.includes(categoriaParam) ? categoriaParam : 'todas'

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [p, c] = await Promise.all([fetchProductos(), fetchCategorias()])
        if (!active) return
        setProductos(p)
        setCategorias(c)
      } catch {
        if (active) setError('No se pudo cargar el catálogo. Inténtalo de nuevo.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  /** Cambia `q`, `cat` u `orden` preservando los demás parámetros. */
  function setParam(cambios: Record<string, string | null>, replace: boolean) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(cambios)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace })
  }

  const visibles = useMemo(() => {
    const termino = normalizar(q.trim())
    let lista: Producto[] =
      categoria === 'todas' ? productos : productos.filter((p) => p.categoria === categoria)
    if (termino) {
      lista = lista.filter(
        (p) =>
          normalizar(p.nombre).includes(termino) ||
          normalizar(p.codigo ?? '').includes(termino),
      )
    }
    if (orden === 'nombre') lista = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    else if (orden === 'precio-asc') lista = [...lista].sort((a, b) => a.precio - b.precio)
    else if (orden === 'precio-desc') lista = [...lista].sort((a, b) => b.precio - a.precio)
    return lista
  }, [productos, categoria, q, orden])

  const jsonLd = useMemo(
    () => itemListJsonLd(visibles.map((p) => ({ id: p.id, nombre: p.nombre }))),
    [visibles],
  )

  // Canonical fijo a la raíz: las combinaciones de filtro (`?q=…&cat=…`) no son
  // URLs canónicas propias, todas señalan al catálogo completo.
  useSeo({
    title: 'Catálogo de equipos, licencias y servicios | Tienda Maxan',
    description:
      'Explora el catálogo de Maxan Sistemas: equipos, licencias y servicios de tecnología para empresas en Colombia. Genera tu cotización en línea.',
    path: '/',
    jsonLd: [jsonLd],
  })

  const filtros: { value: Categoria | 'todas'; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    ...categorias.map((c) => ({ value: c, label: c })),
  ]

  const hayFiltros = q.trim() !== '' || categoria !== 'todas' || orden !== 'relevancia'

  return (
    <>
      <section className="relative w-full overflow-hidden bg-maxan-navy text-white">
        <img
          src="/images/hero-tienda.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-maxan-navy/95 via-maxan-navy/75 to-maxan-navy/40" />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-16 sm:px-10 sm:py-20 lg:py-24">
          <p className="eyebrow text-maxan-primary-ink">Tienda Maxan</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Equipos, licencias y servicios para tu empresa
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            Agrega al carrito y genera tu cotización en línea. Un asesor de Maxan confirma
            disponibilidad, precio final y condiciones de venta.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12">
        <section aria-labelledby="titulo-catalogo">
          <h2 id="titulo-catalogo" className="section-title">
            Catálogo
          </h2>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-maxan-danger bg-maxan-danger-soft px-4 py-3 text-sm font-medium text-maxan-danger"
          >
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:items-end">
          <form
            role="search"
            aria-label="Buscar productos"
            onSubmit={(e) => e.preventDefault()}
            noValidate
          >
            <label htmlFor="buscar-producto" className="field-label">
              Buscar por nombre o código
            </label>
            <input
              id="buscar-producto"
              type="search"
              value={q}
              onChange={(e) => setParam({ q: e.target.value }, true)}
              placeholder="Ej. Lenovo, Kaspersky, HDD1TB…"
              className="field-input w-full"
            />
          </form>
          <div>
            <label htmlFor="orden-productos" className="field-label">
              Ordenar por
            </label>
            <select
              id="orden-productos"
              value={orden}
              onChange={(e) => setParam({ orden: e.target.value }, false)}
              className="field-input w-full sm:w-auto"
            >
              {ORDENES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filtrar por categoría"
          className="mt-4 flex flex-wrap gap-2"
        >
          {filtros.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={categoria === f.value}
              onClick={() => setParam({ cat: f.value === 'todas' ? null : f.value }, false)}
              className={categoria === f.value ? 'btn btn-primary px-4' : 'btn btn-secondary px-4'}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p role="status" className="mt-4 text-sm text-maxan-text-secondary">
          {loading
            ? 'Cargando catálogo…'
            : visibles.length === 0
              ? 'Sin resultados para esta búsqueda.'
              : `${visibles.length} ${visibles.length === 1 ? 'producto' : 'productos'}${
                  categoria === 'todas' ? '' : ` en ${categoria}`
                }${q.trim() ? ` para “${q.trim()}”` : ''}`}
        </p>

        {!loading && !error && hayFiltros && visibles.length > 0 && (
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: false })}
            className="btn btn-ghost mt-2 px-3 text-sm"
          >
            Limpiar búsqueda y filtros
          </button>
        )}

        {loading ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-96 animate-pulse bg-maxan-surface-secondary" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="card mt-6 px-6 py-12 text-center">
            <p className="text-maxan-text-secondary">
              {q.trim()
                ? `No encontramos productos para “${q.trim()}”${
                    categoria !== 'todas' ? ` en ${categoria}` : ''
                  }. Prueba con otro término o escríbenos para cotizarlo.`
                : 'No hay productos en esta categoría. Prueba con otra o escríbenos para cotizarlo.'}
            </p>
            <button
              type="button"
              onClick={() => setSearchParams({}, { replace: false })}
              className="btn btn-secondary mt-6 px-5"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        )}
        </section>
      </div>
    </>
  )
}
