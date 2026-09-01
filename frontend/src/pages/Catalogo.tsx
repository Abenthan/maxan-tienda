import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { fetchProductos, fetchCategorias, type Producto, type Categoria } from '../lib/api'

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
        if (active) {
          setProductos(p)
          setCategorias(c)
        }
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

  const visibles = categoria === 'todas' ? productos : productos.filter((p) => p.categoria === categoria)
  const disponibles = visibles.filter((p) => p.disponible)
  const sinStock = visibles.filter((p) => !p.disponible)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-10 flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy">Catálogo</h1>
          <p className="mt-2 text-gray-500">
            Equipos, licencias y servicios de Maxan Sistemas. Cotiza lo que necesites.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Cargando catálogo…</div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setCategoria('todas')}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  categoria === 'todas'
                    ? 'bg-navy text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-navy/30'
                }`}
              >
                Todas
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoria(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    categoria === cat
                      ? 'bg-navy text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-navy/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {disponibles.length === 0 && sinStock.length === 0 ? (
              <div className="text-gray-500">No hay productos en esta categoría.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {disponibles.map((p) => (
                  <ProductCard key={p.id} producto={p} />
                ))}
                {sinStock.map((p) => (
                  <ProductCard key={p.id} producto={p} agotado />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-400 text-center">
          © {new Date().getFullYear()} Maxan Sistemas
        </div>
      </footer>
    </div>
  )
}

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}

function ProductCard({ producto, agotado = false }: { producto: Producto; agotado?: boolean }) {
  return (
    <Link
      to={`/producto/${producto.id}`}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-navy/30 transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded">
          {producto.categoria || 'Sin categoría'}
        </span>
        {producto.destacado && (
          <span className="inline-block bg-brand/10 text-brand text-xs font-semibold px-2 py-1 rounded">
            Destacado
          </span>
        )}
      </div>
      <h2 className="mt-4 font-semibold text-navy">{producto.nombre}</h2>
      {producto.descripcion && <p className="mt-2 text-sm text-gray-500 line-clamp-2">{producto.descripcion}</p>}
      <div className="mt-4 flex items-end justify-between">
        <span className="text-lg font-bold text-navy">{formatCOP(producto.precio)}</span>
        {agotado ? (
          <span className="text-xs text-red-500 font-medium">Agotado</span>
        ) : (
          <span className="text-xs text-gray-400">{producto.inventariable ? `${producto.stock} en stock` : 'Disponible'}</span>
        )}
      </div>
    </Link>
  )
}