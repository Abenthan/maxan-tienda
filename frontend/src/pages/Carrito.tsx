import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { crearPedido, fetchProducto, type Pedido } from '../lib/api'
import { redirectToAuthLogin } from '../lib/authSso'
import { formatCOP } from '../lib/format'
import { useSeo } from '../lib/seo'
import { HORARIO, MAIL, MAIL_LINK, TIEMPO_RESPUESTA, WA_DISPLAY, waLink } from '../lib/wa'

type Cambio =
  | { tipo: 'precio'; productoId: number; nombre: string; anterior: number; actual: number }
  | { tipo: 'no-disponible'; productoId: number; nombre: string }
  | { tipo: 'eliminado'; productoId: number; nombre: string }

export default function Carrito() {
  const { items, setCantidad, remove, setPrecio, clear, total, count } = useCart()
  const { user, loading: authLoading } = useAuth()
  const [observaciones, setObservaciones] = useState('')
  const [revalidando, setRevalidando] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cambios, setCambios] = useState<Cambio[] | null>(null)
  const [avisoRevalidacion, setAvisoRevalidacion] = useState<string | null>(null)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const confirmacionRef = useRef<HTMLHeadingElement | null>(null)

  useSeo({
    title: 'Carrito y cotización | Tienda Maxan',
    description: 'Revisa los productos de tu carrito y genera tu cotización de Maxan Sistemas.',
    path: '/carrito',
    noindex: true,
  })

  useEffect(() => {
    if (pedido) confirmacionRef.current?.focus()
  }, [pedido])

  function currentUrl() {
    return window.location.origin + window.location.pathname
  }

  /**
   * Compara cada item con el estado real del catálogo antes de cotizar. El
   * carrito vive en localStorage y puede estar desactualizado (precio, stock o
   * producto retirado); el backend también valida, pero así el usuario lo sabe
   * antes y no recibe un error que no entiende.
   */
  async function revalidar(): Promise<Cambio[]> {
    const resultados = await Promise.allSettled(
      items.map((it) => fetchProducto(it.productoId)),
    )

    const cambios: Cambio[] = []
    let fallos = 0
    resultados.forEach((res, i) => {
      const it = items[i]
      if (res.status === 'rejected') {
        fallos += 1
        return
      }
      const actual = res.value
      if (actual.precio <= 0) {
        cambios.push({ tipo: 'no-disponible', productoId: it.productoId, nombre: actual.nombre })
      } else if (!actual.disponible) {
        cambios.push({ tipo: 'no-disponible', productoId: it.productoId, nombre: actual.nombre })
      } else if (actual.precio !== it.precio) {
        cambios.push({
          tipo: 'precio',
          productoId: it.productoId,
          nombre: actual.nombre,
          anterior: it.precio,
          actual: actual.precio,
        })
      }
    })

    if (fallos > 0 && cambios.length === 0) {
      throw new Error('revalidar-fallo')
    }
    return cambios
  }

  async function handleCheckout() {
    if (!user || items.length === 0) return
    setError(null)
    setAvisoRevalidacion(null)

    setRevalidando(true)
    const cambios = await revalidar().catch(() => null)
    setRevalidando(false)

    if (cambios === null) {
      setAvisoRevalidacion(
        'No pudimos revalidar los precios con el catálogo. Revisa tu conexión e inténtalo de nuevo.',
      )
      return
    }

    if (cambios.length > 0) {
      setCambios(cambios)
      return
    }

    await crear()
  }

  function aplicarCambios() {
    if (!cambios) return
    for (const cambio of cambios) {
      if (cambio.tipo === 'precio') setPrecio(cambio.productoId, cambio.actual)
      else remove(cambio.productoId)
    }
    setCambios(null)
  }

  async function crear() {
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

  const textoCambio = (c: Cambio): string => {
    if (c.tipo === 'precio') {
      return `“${c.nombre}” cambió de precio: ${formatCOP(c.anterior)} → ${formatCOP(c.actual)}.`
    }
    if (c.tipo === 'no-disponible') {
      return `“${c.nombre}” ya no está disponible en el catálogo para cotizar.`
    }
    return `“${c.nombre}” ya no existe en el catálogo.`
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <nav aria-label="Migas de pan" className="text-sm text-maxan-text-secondary">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/" className="underline-offset-4 hover:text-maxan-navy hover:underline">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-maxan-navy" aria-current="page">
            Carrito
          </li>
        </ol>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-maxan-navy">Carrito y cotización</h1>

      {pedido ? (
        <section
          role="status"
          aria-labelledby="titulo-confirmacion"
          className="card mt-8 px-6 py-10 text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-maxan-success-soft">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-maxan-success"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
          </div>
          <h2
            id="titulo-confirmacion"
            ref={confirmacionRef}
            tabIndex={-1}
            className="mt-4 text-2xl font-bold text-maxan-navy focus:outline-none"
          >
            Cotización <span className="text-maxan-primary">#{pedido.id}</span> creada
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-maxan-text-secondary">
            Quedó en estado <span className="font-semibold">pendiente</span>. Un asesor de Maxan
            revisa la disponibilidad y el precio final, y te confirma la venta. Guarda este número:
            puedes seguir el estado desde mis cotizaciones con la cotización{' '}
            <span className="font-semibold text-maxan-navy">#{pedido.id}</span> resaltada.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={`/cotizaciones?destacar=${pedido.id}`} className="btn btn-primary px-5">
              Ver la cotización #{pedido.id}
            </Link>
            <Link to="/" className="btn btn-secondary px-5">
              Seguir comprando
            </Link>
          </div>
        </section>
      ) : items.length === 0 ? (
        <div className="card mt-8 px-6 py-14 text-center">
          <p className="text-lg text-maxan-text-secondary">Tu carrito está vacío.</p>
          <Link to="/" className="btn btn-primary mt-6 px-6">
            Explorar el catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section aria-label="Productos del carrito" className="space-y-4 lg:col-span-2">
            {items.map((it) => (
              <article key={it.productoId} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-maxan-navy">{it.nombre}</h2>
                    <p className="mt-1 text-sm text-maxan-text-muted">
                      {it.codigo}
                      {it.unidadMedida ? ` · ${it.unidadMedida}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-maxan-text-secondary">
                      {formatCOP(it.precio)} por unidad
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <label
                        htmlFor={`cantidad-${it.productoId}`}
                        className="field-label text-xs"
                      >
                        Cantidad
                      </label>
                      <input
                        id={`cantidad-${it.productoId}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={it.cantidad}
                        onChange={(e) =>
                          setCantidad(it.productoId, Math.max(1, Number(e.target.value) || 1))
                        }
                        className="field-input w-24"
                      />
                    </div>
                    <p className="w-32 text-right text-lg font-bold text-maxan-navy">
                      {formatCOP(it.precio * it.cantidad)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(it.productoId)}
                      aria-label={`Quitar ${it.nombre} del carrito`}
                      className="btn btn-secondary px-3 text-maxan-danger"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <section
              aria-labelledby="titulo-alcance"
              className="card px-6 py-6"
            >
              <h2 id="titulo-alcance" className="text-lg font-bold text-maxan-navy">
                Qué pasa después de cotizar
              </h2>
              <p className="prose-body mt-2">
                El carrito es un pedido estimado, no una venta. Un asesor revisa cada línea antes de
                confirmar:
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-semibold text-maxan-navy">Entrega</dt>
                  <dd className="mt-1 text-sm text-maxan-text-secondary">
                    Coordinada con el asesor: Bogotá y envíos nacionales, según referencia y
                    destino.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-maxan-navy">Facturación</dt>
                  <dd className="mt-1 text-sm text-maxan-text-secondary">
                    Factura electrónica al confirmar la venta. La cotización no genera cargos
                    automáticos: no hay pagos en línea.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-maxan-navy">Garantía</dt>
                  <dd className="mt-1 text-sm text-maxan-text-secondary">
                    La del fabricante en equipos y licencias; el asesor la confirma junto a las
                    condiciones de venta.
                  </dd>
                </div>
              </dl>
            </section>
          </section>

          <aside
            aria-labelledby="titulo-resumen"
            className="card h-fit px-6 py-6 lg:sticky lg:top-28"
          >
            <h2 id="titulo-resumen" className="text-lg font-bold text-maxan-navy">
              Resumen
            </h2>

            <dl className="mt-4 space-y-2 text-sm text-maxan-text-secondary">
              <div className="flex items-center justify-between">
                <dt>Artículos</dt>
                <dd className="font-medium text-maxan-navy">{count}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-maxan-border pt-2 text-lg font-bold text-maxan-navy">
                <dt>Total estimado</dt>
                <dd>{formatCOP(total)}</dd>
              </div>
            </dl>
            <p className="field-hint mt-2">
              Es un valor aproximado: precios y stock se revalidan con el catálogo antes de cotizar,
              y el asesor confirma el precio final.
            </p>

            <div className="mt-6">
              <label htmlFor="observaciones" className="field-label">
                Observaciones (opcional)
              </label>
              <textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Necesito entrega en Bogotá, fecha sugerida, etc."
                className="field-input"
              />
              <p className="field-hint">El asesor usa estas notas para preparar la cotización.</p>
            </div>

            {!authLoading && !user && (
              <p className="mt-4 text-sm font-medium text-maxan-text-secondary">
                Inicia sesión para generar la cotización y seguir su estado.
              </p>
            )}

            {avisoRevalidacion && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-maxan-danger bg-maxan-danger-soft px-4 py-3 text-sm font-medium text-maxan-danger"
              >
                {avisoRevalidacion}
              </p>
            )}

            {cambios && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-maxan-warning bg-maxan-warning-soft px-4 py-3"
              >
                <p className="text-sm font-semibold text-maxan-navy">
                  El catálogo cambió desde que armaste el carrito:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-maxan-text-secondary">
                  {cambios.map((c) => (
                    <li key={`${c.tipo}-${c.productoId}`}>{textoCambio(c)}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={aplicarCambios}
                  className="btn btn-secondary mt-3 px-4"
                >
                  Actualizar carrito
                </button>
                <p className="field-hint mt-2">
                  Aplicado eso, revisa las cantidades y genera la cotización de nuevo.
                </p>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-maxan-danger bg-maxan-danger-soft px-4 py-3 text-sm font-medium text-maxan-danger"
              >
                {error}
              </p>
            )}

            {user ? (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={submitting || revalidando || items.length === 0}
                className="btn btn-primary mt-6 w-full px-5"
              >
                {revalidando
                  ? 'Revalidando precios…'
                  : submitting
                    ? 'Generando cotización…'
                    : 'Generar cotización'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => redirectToAuthLogin(currentUrl())}
                className="btn btn-primary mt-6 w-full px-5"
              >
                Iniciar sesión para cotizar
              </button>
            )}

            <p className="field-hint mt-3">
              Generar la cotización no realiza ningún pago. Un asesor confirma el valor final.
            </p>

            <section
              aria-labelledby="titulo-contacto"
              className="mt-6 border-t border-maxan-border pt-5"
            >
              <h2 id="titulo-contacto" className="text-sm font-bold text-maxan-navy">
                ¿Dudas para cotizar?
              </h2>
              <p className="mt-2 text-sm text-maxan-text-secondary">
                Te respondemos {TIEMPO_RESPUESTA.toLowerCase()} durante el horario de atención.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href={waLink(
                      'Hola, estoy armando una cotización en la Tienda Maxan y necesito ayuda.',
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-maxan-navy underline-offset-4 hover:text-maxan-navy hover:underline"
                  >
                    WhatsApp {WA_DISPLAY}
                    <span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                </li>
                <li>
                  <a
                    href={MAIL_LINK}
                    className="font-semibold text-maxan-navy underline-offset-4 hover:text-maxan-navy hover:underline"
                  >
                    {MAIL}
                  </a>
                </li>
                <li className="text-maxan-text-secondary">{HORARIO}</li>
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
