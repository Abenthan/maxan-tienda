import { useEffect, useMemo, useState } from 'react'
import ProductCard from '../components/ProductCard'
import { fetchProductos, fetchCategorias, type Producto, type Categoria } from '../lib/api'
import { itemListJsonLd, useSeo } from '../lib/seo'

export default function Catalogo() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoria, setCategoria] = useState<Categoria | 'todas'>('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const visibles = useMemo(
    () => (categoria === 'todas' ? productos : productos.filter((p) => p.categoria === categoria)),
    [productos, categoria],
  )

  const jsonLd = useMemo(
    () => itemListJsonLd(visibles.map((p) => ({ id: p.id, nombre: p.nombre }))),
    [visibles],
  )

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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <section className="rounded-xl bg-maxan-navy px-6 py-10 text-white sm:px-10 sm:py-12">
        <p className="eyebrow text-maxan-primary-ink">Tienda Maxan</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Equipos, licencias y servicios para tu empresa
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80">
          Agrega al carrito y genera tu cotización en línea. Un asesor de Maxan confirma
          disponibilidad, precio final y condiciones de venta.
        </p>
      </section>

      <section aria-labelledby="titulo-catalogo" className="mt-10">
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

        <div
          role="group"
          aria-label="Filtrar por categoría"
          className="mt-6 flex flex-wrap gap-2"
        >
          {filtros.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={categoria === f.value}
              onClick={() => setCategoria(f.value)}
              className={categoria === f.value ? 'btn btn-primary px-4' : 'btn btn-secondary px-4'}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p role="status" className="mt-4 text-sm text-maxan-text-secondary">
          {loading
            ? 'Cargando catálogo…'
            : `${visibles.length} ${visibles.length === 1 ? 'producto' : 'productos'}${
                categoria === 'todas' ? '' : ` en ${categoria}`
              }`}
        </p>

        {loading ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-96 animate-pulse bg-maxan-surface-secondary" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="card mt-6 px-6 py-12 text-center">
            <p className="text-maxan-text-secondary">
              No hay productos en esta categoría. Prueba con otra o escríbenos para cotizarlo.
            </p>
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
  )
}
