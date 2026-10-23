import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cancelarPedido, fetchPedido, fetchPedidos, type Pedido } from '../lib/api'
import { redirectToAuthLogin } from '../lib/authSso'
import { formatCOP, formatFechaHora } from '../lib/format'
import { useSeo } from '../lib/seo'

const ESTADOS: Record<Pedido['estado'], { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente', clase: 'badge-warning' },
  confirmada: { texto: 'Confirmada', clase: 'badge-success' },
  cancelada: { texto: 'Cancelada', clase: 'badge-neutral' },
}

export default function Cotizaciones() {
  const { user, loading: authLoading } = useAuth()
  const [resultado, setResultado] = useState<{ pedidos: Pedido[]; error: string | null } | null>(
    null,
  )
  const [detalle, setDetalle] = useState<Pedido | null>(null)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<number | null>(null)

  useSeo({
    title: 'Mis cotizaciones | Tienda Maxan',
    description: 'Consulta el estado de las cotizaciones que generaste en la Tienda Maxan.',
    path: '/cotizaciones',
    noindex: true,
  })

  useEffect(() => {
    if (!user) return
    let active = true
    fetchPedidos()
      .then((data) => {
        if (active) setResultado({ pedidos: data, error: null })
      })
      .catch(() => {
        if (active)
          setResultado({
            pedidos: [],
            error: 'No se pudieron cargar tus cotizaciones. Inténtalo de nuevo.',
          })
      })
    return () => {
      active = false
    }
  }, [user])

  const pedidos = resultado?.pedidos ?? []
  const error = resultado?.error ?? null
  const loading = resultado === null && !!user

  async function alternarDetalle(id: number) {
    if (detalleId === id) {
      setDetalleId(null)
      setDetalle(null)
      return
    }
    setDetalleId(id)
    setDetalle(null)
    setErrorDetalle(null)
    try {
      const data = await fetchPedido(id)
      setDetalle(data)
    } catch {
      setErrorDetalle('No se pudo cargar el detalle de la cotización.')
    }
  }

  async function cancelar(id: number) {
    setCancelando(id)
    setErrorDetalle(null)
    try {
      await cancelarPedido(id)
      setResultado((prev) =>
        prev
          ? { ...prev, pedidos: prev.pedidos.map((p) => (p.id === id ? { ...p, estado: 'cancelada' } : p)) }
          : prev,
      )
      if (detalleId === id) setDetalle(null)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error as string | undefined)
        : undefined
      setErrorDetalle(message || 'No se pudo cancelar la cotización.')
    } finally {
      setCancelando(null)
    }
  }

  function currentUrl() {
    return window.location.origin + window.location.pathname + window.location.search
  }

  if (!authLoading && !user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-maxan-navy">Mis cotizaciones</h1>
        <div className="card mt-8 px-6 py-12 text-center">
          <p className="text-lg text-maxan-text-secondary">
            Inicia sesión para ver el estado de tus cotizaciones.
          </p>
          <button
            type="button"
            onClick={() => redirectToAuthLogin(currentUrl())}
            className="btn btn-primary mt-6 px-6"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <nav aria-label="Migas de pan" className="text-sm text-maxan-text-secondary">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/" className="underline-offset-4 hover:text-maxan-navy hover:underline">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-maxan-navy" aria-current="page">
            Cotizaciones
          </li>
        </ol>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-maxan-navy">Mis cotizaciones</h1>
      <p className="prose-body mt-2">
        Cada cotización la confirma un asesor de Maxan Sistemas. El estado refleja el avance de tu
        solicitud.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-maxan-danger bg-maxan-danger-soft px-4 py-3 text-sm font-medium text-maxan-danger"
        >
          {error}
        </p>
      )}

      {errorDetalle && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-maxan-danger bg-maxan-danger-soft px-4 py-3 text-sm font-medium text-maxan-danger"
        >
          {errorDetalle}
        </p>
      )}

      {loading ? (
        <p role="status" className="mt-8 text-maxan-text-secondary">
          Cargando cotizaciones…
        </p>
      ) : pedidos.length === 0 ? (
        <div className="card mt-8 px-6 py-14 text-center">
          <p className="text-lg text-maxan-text-secondary">Todavía no tienes cotizaciones.</p>
          <Link to="/" className="btn btn-primary mt-6 px-6">
            Explorar el catálogo
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {pedidos.map((p) => {
            const estado = ESTADOS[p.estado]
            return (
              <li key={p.id} className="card px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold text-maxan-navy">Cotización {p.id}</h2>
                      <span className={`badge ${estado.clase}`}>{estado.texto}</span>
                    </div>
                    <p className="mt-1 text-sm text-maxan-text-muted">
                      Creada el {formatFechaHora(p.createdAt)} · {p.items.length}{' '}
                      {p.items.length === 1 ? 'producto' : 'productos'}
                    </p>
                    {p.observaciones && (
                      <p className="mt-2 text-sm text-maxan-text-secondary">
                        Observaciones: {p.observaciones}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-maxan-navy">{formatCOP(p.total)}</p>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => alternarDetalle(p.id)}
                        aria-expanded={detalleId === p.id}
                        aria-controls={`detalle-${p.id}`}
                        className="btn btn-secondary px-4"
                      >
                        {detalleId === p.id ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                      {p.estado === 'pendiente' && (
                        <button
                          type="button"
                          onClick={() => cancelar(p.id)}
                          disabled={cancelando === p.id}
                          className="btn btn-secondary px-4 text-maxan-danger"
                        >
                          {cancelando === p.id ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div id={`detalle-${p.id}`} hidden={detalleId !== p.id} className="mt-5 border-t border-maxan-border pt-4">
                  {detalleId === p.id && !detalle && (
                    <p role="status" className="text-sm text-maxan-text-secondary">
                      Cargando detalle…
                    </p>
                  )}
                  {detalleId === p.id && detalle && (
                    <ul className="space-y-2">
                      {detalle.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                        >
                          <span className="font-medium text-maxan-navy">
                            {item.nombre}
                            <span className="ml-2 text-maxan-text-muted">
                              {item.cantidad} × {formatCOP(item.precio)}
                            </span>
                          </span>
                          <span className="font-semibold text-maxan-navy">
                            {formatCOP(item.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
