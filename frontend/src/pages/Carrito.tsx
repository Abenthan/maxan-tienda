import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { crearPedido, type Pedido } from '../lib/api'
import { redirectToAuthLogin } from '../lib/authSso'

export default function Carrito() {
  const { items, setCantidad, remove, clear, total, count } = useCart()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pedido, setPedido] = useState<Pedido | null>(null)

  function currentUrl() {
    return window.location.origin + window.location.pathname + window.location.search
  }

  async function handleCheckout() {
    if (!user) return
    setSubmitting(true)
    setError(null)
    try {
      const creado = await crearPedido({
        observaciones: observaciones.trim() || null,
        items: items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad })),
      })
      setPedido(creado)
      clear()
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error as string | undefined)
        : undefined
      setError(message || 'No se pudo crear la cotización. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-10 flex-1 w-full">
        <Link to="/" className="text-sm text-brand hover:underline">
          ← Volver al catálogo
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-navy">Carrito y cotización</h1>

        {pedido ? (
          <div className="mt-8 bg-white rounded-xl border border-green-200 p-8 text-center">
            <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full bg-green-50 text-green-600 text-3xl">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-bold text-navy">Cotización {pedido.id} creada</h2>
            <p className="mt-2 text-gray-600">
              Quedó en estado <span className="font-medium">pendiente</span>. Un asesor de Maxan la
              revisará y confirmará la venta. Puedes seguir este estado desde la consulta de pedidos.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => navigate('/carrito')} className="bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
                Nueva cotización
              </button>
              <Link to="/" className="px-6 py-3 rounded-lg font-semibold text-brand hover:underline">
                Seguir comprando
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Tu carrito está vacío.</p>
            <Link to="/" className="mt-4 inline-block bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
              Explorar el catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((it) => (
                <div key={it.productoId} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy">{it.nombre}</h3>
                    <p className="text-sm text-gray-400">{it.codigo}</p>
                    <p className="mt-1 text-sm text-gray-500">{formatCOP(it.precio)} × {it.cantidad}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCantidad(it.productoId, it.cantidad - 1)}
                      className="w-8 h-8 rounded border border-gray-200 text-navy hover:bg-gray-100"
                      aria-label="Restar"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-medium">{it.cantidad}</span>
                    <button
                      onClick={() => setCantidad(it.productoId, it.cantidad + 1)}
                      className="w-8 h-8 rounded border border-gray-200 text-navy hover:bg-gray-100"
                      aria-label="Sumar"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-24 text-right font-semibold text-navy">{formatCOP(it.precio * it.cantidad)}</div>
                  <button
                    onClick={() => remove(it.productoId)}
                    className="text-gray-400 hover:text-red-500 px-2"
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <aside className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
              <h2 className="font-semibold text-navy">Resumen</h2>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Artículos</span>
                <span>{count}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-lg font-bold text-navy">
                <span>Total</span>
                <span>{formatCOP(total)}</span>
              </div>

              <label className="mt-6 block text-sm text-gray-500">
                Observaciones (opcional)
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm text-navy focus:border-brand focus:outline-none"
                />
              </label>

              {!authLoading && !user && (
                <p className="mt-4 text-sm text-red-600">
                  Necesitas iniciar sesión para generar la cotización.
                </p>
              )}
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              {user ? (
                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="mt-6 w-full bg-brand text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Generando cotización…' : 'Generar cotización'}
                </button>
              ) : (
                <button
                  onClick={() => redirectToAuthLogin(currentUrl())}
                  className="mt-6 w-full bg-navy text-white py-3 rounded-lg font-semibold hover:opacity-90"
                >
                  Iniciar sesión para cotizar
                </button>
              )}
            </aside>
          </div>
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