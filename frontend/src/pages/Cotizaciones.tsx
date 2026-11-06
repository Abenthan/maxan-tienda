import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cancelarPedido, fetchPedido, fetchPedidos, type Pedido } from '../lib/api'
import { redirectToAuthLogin, type SsoUser } from '../lib/authSso'
import { formatCOP, formatFechaHora } from '../lib/format'
import { useSeo } from '../lib/seo'

const ESTADOS: Record<Pedido['estado'], { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente', clase: 'badge-warning' },
  confirmada: { texto: 'Confirmada', clase: 'badge-success' },
  cancelada: { texto: 'Cancelada', clase: 'badge-neutral' },
}

type CargaDetalle =
  | { status: 'loading' }
  | { status: 'success'; pedido: Pedido }
  | { status: 'error'; mensaje: string }

interface ResultadoLista {
  usuario: SsoUser
  pedidos: Pedido[]
  error: string | null
}

export default function Cotizaciones() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  // Confirmación durable: al crear una cotización desde el carrito se llega a
  // /cotizaciones?destacar=N y esa tarjeta se resalta y recibe el foco.
  const destacar = Number(searchParams.get('destacar')) || null
  const [resultado, setResultado] = useState<ResultadoLista | null>(null)
  const [intento, setIntento] = useState(0)
  const [detalles, setDetalles] = useState<Record<number, CargaDetalle>>({})
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState<number | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<{ id: number; mensaje: string } | null>(null)
  const solicitudRef = useRef(0)
  const confirmarRef = useRef<HTMLButtonElement | null>(null)

  useSeo({
    title: 'Mis cotizaciones | Tienda Maxan',
    description: 'Consulta el estado de las cotizaciones que generaste en la Tienda Maxan.',
    path: '/cotizaciones',
    noindex: true,
  })

  useEffect(() => {
    if (!user) return

    let active = true
    const usuario = user

    fetchPedidos()
      .then((data) => {
        if (active) setResultado({ usuario, pedidos: data, error: null })
      })
      .catch(() => {
        if (!active) return
        setResultado({
          usuario,
          pedidos: [],
          error: 'No se pudieron cargar tus cotizaciones. Inténtalo de nuevo.',
        })
      })

    return () => {
      active = false
    }
  }, [user, intento])

  useEffect(() => {
    if (confirmandoId !== null) confirmarRef.current?.focus()
  }, [confirmandoId])

  const datosActuales = resultado && resultado.usuario === user ? resultado : null
  const pedidos = datosActuales?.pedidos ?? []
  const errorLista = datosActuales?.error ?? null
  const loadingLista = !!user && datosActuales === null

  // Resalta y enfoca la cotización que acaba de generarse en el carrito
  // (/cotizaciones?destacar=N). Depende de `resultado` para no recrear arrays
  // derivados en cada render.
  useEffect(() => {
    if (destacar === null || !resultado || resultado.usuario !== user) return
    if (resultado.error || !resultado.pedidos.some((p) => p.id === destacar)) return
    const elemento = document.getElementById(`cotizacion-${destacar}`)
    if (!elemento) return
    elemento.scrollIntoView({ block: 'center' })
    elemento.focus({ preventScroll: true })
  }, [destacar, resultado, user])

  function reintentarLista() {
    solicitudRef.current += 1
    setDetalles({})
    setDetalleId(null)
    setConfirmandoId(null)
    setErrorAccion(null)
    setAviso(null)
    setResultado(null)
    setIntento((n) => n + 1)
  }

  async function refrescarLista() {
    if (!user) return
    try {
      const data = await fetchPedidos()
      setResultado({ usuario: user, pedidos: data, error: null })
    } catch {
      // La lista actual se conserva; el error de la acción ya se muestra en la tarjeta.
    }
  }

  function cargarDetalle(id: number) {
    const solicitud = ++solicitudRef.current
    setDetalles((prev) => ({ ...prev, [id]: { status: 'loading' } }))

    fetchPedido(id)
      .then((data) => {
        if (solicitud !== solicitudRef.current) return
        setDetalles((prev) => ({ ...prev, [id]: { status: 'success', pedido: data } }))
      })
      .catch((err) => {
        if (solicitud !== solicitudRef.current) return
        const noExiste = axios.isAxiosError(err) && err.response?.status === 404
        setDetalles((prev) => ({
          ...prev,
          [id]: {
            status: 'error',
            mensaje: noExiste
              ? 'Esta cotización ya no está disponible.'
              : 'No se pudo cargar el detalle. Revisa tu conexión e inténtalo de nuevo.',
          },
        }))
      })
  }

  function alternarDetalle(id: number) {
    if (detalleId === id) {
      solicitudRef.current += 1
      setDetalleId(null)
      return
    }
    setDetalleId(id)
    setErrorAccion(null)
    cargarDetalle(id)
  }

  function pedirConfirmacion(id: number) {
    setConfirmandoId(id)
    setErrorAccion(null)
    setAviso(null)
  }

  function cancelarConfirmacion(id: number) {
    setConfirmandoId(null)
    window.requestAnimationFrame(() => {
      document.getElementById(`cancelar-${id}`)?.focus()
    })
  }

  async function cancelar(id: number) {
    setCancelando(id)
    setErrorAccion(null)
    setAviso(null)

    try {
      const actualizada = await cancelarPedido(id)

      // Invalida cualquier detalle en vuelo para que no pise el estado ya cancelado.
      solicitudRef.current += 1
      setResultado((prev) =>
        prev && prev.usuario === user
          ? { ...prev, pedidos: prev.pedidos.map((p) => (p.id === id ? actualizada : p)) }
          : prev,
      )
      setDetalles((prev) => ({ ...prev, [id]: { status: 'success', pedido: actualizada } }))
      setConfirmandoId(null)
      setAviso(`Cotización ${id} cancelada.`)
      window.requestAnimationFrame(() => {
        document.getElementById(`detalle-btn-${id}`)?.focus()
      })
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error as string | undefined)
        : undefined

      if (status === 409) {
        setConfirmandoId(null)
        setErrorAccion({
          id,
          mensaje:
            message || 'La cotización ya no está pendiente. Actualizamos la lista con su estado real.',
        })
        window.requestAnimationFrame(() => {
          document.getElementById(`detalle-btn-${id}`)?.focus()
        })
        void refrescarLista()
      } else {
        setErrorAccion({ id, mensaje: message || 'No se pudo cancelar la cotización.' })
      }
    } finally {
      setCancelando(null)
    }
  }

  function contenidoDetalle(id: number) {
    const estado = detalles[id]

    if (!estado || estado.status === 'loading') {
      return (
        <p role="status" className="text-sm text-maxan-text-secondary">
          Cargando detalle…
        </p>
      )
    }

    if (estado.status === 'error') {
      return (
        <div role="alert" className="text-sm text-maxan-danger">
          <p>{estado.mensaje}</p>
          <button
            type="button"
            onClick={() => cargarDetalle(id)}
            className="btn btn-secondary mt-3 px-4"
          >
            Reintentar
          </button>
        </div>
      )
    }

    return (
      <ul className="space-y-2">
        {estado.pedido.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-maxan-navy">
              {item.nombre}
              <span className="ml-2 text-maxan-text-muted">
                {item.cantidad} × {formatCOP(item.precio)}
              </span>
            </span>
            <span className="font-semibold text-maxan-navy">{formatCOP(item.subtotal)}</span>
          </li>
        ))}
      </ul>
    )
  }

  function currentUrl() {
    return window.location.origin + window.location.pathname + window.location.search
  }

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-maxan-navy">Mis cotizaciones</h1>
        <p role="status" className="mt-8 text-maxan-text-secondary">
          Cargando sesión…
        </p>
      </div>
    )
  }

  if (!user) {
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

      {aviso && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-maxan-success bg-maxan-success-soft px-4 py-3 text-sm font-medium text-maxan-success"
        >
          {aviso}
        </p>
      )}

      {errorLista ? (
        <div role="alert" className="card mt-8 px-6 py-12 text-center">
          <p className="text-lg text-maxan-text-secondary">{errorLista}</p>
          <button type="button" onClick={reintentarLista} className="btn btn-primary mt-6 px-6">
            Reintentar
          </button>
        </div>
      ) : loadingLista ? (
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
            const abierto = detalleId === p.id
            const cargandoDetalle = abierto && (!detalles[p.id] || detalles[p.id].status === 'loading')
            const destacada = p.id === destacar

            return (
              <li
                key={p.id}
                id={`cotizacion-${p.id}`}
                tabIndex={-1}
                aria-label={`Cotización ${p.id}, estado ${estado.texto}${
                  destacada ? ' (recién generada)' : ''
                }`}
                className={
                  destacada
                    ? 'card px-5 py-5 outline outline-2 outline-offset-2 outline-maxan-primary focus:outline-maxan-primary'
                    : 'card px-5 py-5 focus:outline-none'
                }
              >
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
                    {destacada && (
                      <p className="mt-2 text-sm font-semibold text-maxan-navy">
                        Es la cotización que generaste desde el carrito.
                      </p>
                    )}
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
                        id={`detalle-btn-${p.id}`}
                        onClick={() => alternarDetalle(p.id)}
                        aria-expanded={abierto}
                        aria-controls={`detalle-${p.id}`}
                        aria-label={`${abierto ? 'Ocultar' : 'Ver'} detalle de la cotización ${p.id}`}
                        className="btn btn-secondary px-4"
                      >
                        {abierto ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                      {p.estado === 'pendiente' && confirmandoId !== p.id && (
                        <button
                          type="button"
                          id={`cancelar-${p.id}`}
                          onClick={() => pedirConfirmacion(p.id)}
                          className="btn btn-secondary px-4 text-maxan-danger"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {confirmandoId === p.id && (
                  <div
                    role="group"
                    aria-labelledby={`confirmar-titulo-${p.id}`}
                    aria-describedby={`confirmar-aviso-${p.id}`}
                    className="mt-4 rounded-lg border border-maxan-border bg-maxan-surface-secondary px-4 py-4"
                  >
                    <p id={`confirmar-titulo-${p.id}`} className="font-semibold text-maxan-navy">
                      ¿Cancelar la cotización {p.id}?
                    </p>
                    <p id={`confirmar-aviso-${p.id}`} className="mt-1 text-sm text-maxan-text-secondary">
                      Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        ref={confirmarRef}
                        onClick={() => cancelar(p.id)}
                        disabled={cancelando === p.id}
                        className="btn btn-secondary px-4 text-maxan-danger"
                      >
                        {cancelando === p.id ? 'Cancelando…' : 'Sí, cancelar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelarConfirmacion(p.id)}
                        disabled={cancelando === p.id}
                        className="btn btn-ghost px-4"
                      >
                        Volver
                      </button>
                    </div>
                  </div>
                )}

                {errorAccion?.id === p.id && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-maxan-danger bg-maxan-danger-soft px-4 py-3 text-sm font-medium text-maxan-danger"
                  >
                    {errorAccion.mensaje}
                  </p>
                )}

                <div
                  id={`detalle-${p.id}`}
                  hidden={!abierto}
                  aria-busy={cargandoDetalle}
                  className="mt-5 border-t border-maxan-border pt-4"
                >
                  {abierto && contenidoDetalle(p.id)}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
