import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProducto, type Producto } from '../lib/api'

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchProducto(id!)
      .then((p) => {
        if (active) setProducto(p)
      })
      .catch(() => {
        if (active) setError('No se pudo cargar el producto.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-lg">Tienda Maxan</span>
          <span className="text-sm text-white/70">Maxan Sistemas</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 flex-1 w-full">
        <Link to="/" className="text-sm text-brand hover:underline">
          ← Volver al catálogo
        </Link>

        {loading && <div className="mt-8 text-gray-500">Cargando producto…</div>}
        {error && <div className="mt-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {!loading && !error && producto && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-8">
            <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-1 rounded">
              {producto.categoria || 'Sin categoría'}
            </span>
            <h1 className="mt-4 text-3xl font-bold text-navy">{producto.nombre}</h1>
            {producto.codigo && <p className="mt-1 text-sm text-gray-400">Ref. {producto.codigo}</p>}

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-3xl font-bold text-navy">{formatCOP(producto.precio)}</span>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  producto.disponible ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {producto.disponible
                  ? producto.inventariable
                    ? `${producto.stock} en stock`
                    : 'Disponible'
                  : producto.inventariable
                    ? 'Agotado'
                    : 'No disponible'}
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-gray-400">Unidad de medida</dt>
                <dd className="mt-1 font-medium text-navy">{producto.unidadMedida || 'UND'}</dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <dt className="text-gray-400">Precio por unidad</dt>
                <dd className="mt-1 font-medium text-navy">{formatCOP(producto.precio)}</dd>
              </div>
            </dl>

            {producto.descripcion && (
              <div className="mt-8">
                <h2 className="font-semibold text-navy">Descripción</h2>
                <p className="mt-2 text-gray-600 whitespace-pre-line">{producto.descripcion}</p>
              </div>
            )}

            <div className="mt-10">
              <span className="inline-block bg-brand/10 text-brand px-6 py-3 rounded-lg font-semibold">
                La cotización en línea estará disponible próximamente
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function formatCOP(valor: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
}