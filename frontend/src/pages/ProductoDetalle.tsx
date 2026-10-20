import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { useCart } from '../context/CartContext'
import { fetchProducto, type Producto } from '../lib/api'

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { add } = useCart()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [imgSeleccionada, setImgSeleccionada] = useState(0)

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

  const imagenes = producto?.imagenes || []
  const imgActual = imagenes.length > 0 ? imagenes[imgSeleccionada]?.url : producto?.imagenPrincipal

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-10 flex-1 w-full">
        <Link to="/" className="text-sm text-brand hover:underline">
          ← Volver al catálogo
        </Link>

        {loading && <div className="mt-8 text-gray-500">Cargando producto…</div>}
        {error && <div className="mt-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {!loading && !error && producto && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Galería de imágenes */}
              <div className="lg:w-1/2">
                {imgActual ? (
                  <img
                    src={imgActual}
                    alt={producto.nombre}
                    className="w-full h-80 lg:h-96 object-contain bg-gray-50 rounded-lg"
                  />
                ) : (
                  <div className="w-full h-80 lg:h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-6xl text-gray-300">📦</span>
                  </div>
                )}
                {imagenes.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {imagenes.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setImgSeleccionada(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          idx === imgSeleccionada ? 'border-brand' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-contain bg-gray-50" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info del producto */}
              <div className="lg:w-1/2">
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
                  {producto.disponible ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => {
                          add({
                            productoId: producto.id,
                            nombre: producto.nombre,
                            codigo: producto.codigo,
                            precio: producto.precio,
                            unidadMedida: producto.unidadMedida,
                          })
                          setAdded(true)
                        }}
                        className="bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                      >
                        Agregar al carrito
                      </button>
                      {added && (
                        <button
                          onClick={() => navigate('/carrito')}
                          className="px-6 py-3 rounded-lg font-semibold text-brand hover:underline"
                        >
                          Ver carrito →
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="inline-block bg-gray-100 text-gray-500 px-6 py-3 rounded-lg">
                      Producto no disponible para cotización
                    </span>
                  )}
                </div>
              </div>
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