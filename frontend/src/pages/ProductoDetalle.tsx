import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fetchProducto, type Producto } from '../lib/api'
import { formatCOP } from '../lib/format'
import { breadcrumbJsonLd, productJsonLd, setOgImageSize, useSeo } from '../lib/seo'
import {
  MAIL,
  WA_DISPLAY,
  mailLinkProducto,
  mensajeConsultaDisponibilidad,
  mensajeConsultaPrecio,
  referenciaProducto,
  waLink,
} from '../lib/wa'

type Resultado =
  | { status: 'loading' }
  | { status: 'success'; producto: Producto }
  | { status: 'no-encontrado' }
  | { status: 'error'; mensaje: string }

const DESCRIPCION_GENERICA =
  'Detalle de producto en la Tienda Maxan: equipos, licencias y servicios de Maxan Sistemas.'

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>()
  const { add } = useCart()
  const [resultado, setResultado] = useState<Resultado>({ status: 'loading' })
  const [intento, setIntento] = useState(0)
  const [agregado, setAgregado] = useState(false)
  const [cantidad, setCantidad] = useState(1)
  const [imgSeleccionada, setImgSeleccionada] = useState(0)

  useEffect(() => {
    let active = true
    fetchProducto(id!)
      .then((p) => {
        if (active) setResultado({ status: 'success', producto: p })
      })
      .catch((err) => {
        if (!active) return
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        // 400 = id malformado; 404 = no existe o está inactivo. Ambos son
        // "producto no encontrado" para el usuario (nginx ya devuelve 404).
        const noExiste = status === 400 || status === 404
        setResultado(
          noExiste
            ? { status: 'no-encontrado' }
            : {
                status: 'error',
                mensaje: 'No se pudo cargar el producto. Revisa tu conexión e inténtalo de nuevo.',
              },
        )
      })
    return () => {
      active = false
    }
  }, [id, intento])

  const producto = resultado.status === 'success' ? resultado.producto : null
  const noEncontrado = resultado.status === 'no-encontrado'
  const error = resultado.status === 'error' ? resultado.mensaje : null
  const loading = resultado.status === 'loading'

  const imagenes = producto?.imagenes ?? []
  const imgActual = imagenes[imgSeleccionada]?.url ?? producto?.imagenPrincipal ?? null

  const jsonLd = useMemo(() => {
    if (!producto) return []
    return [
      productJsonLd({
        id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        imagenPrincipal: producto.imagenPrincipal,
        precio: producto.precio,
        disponible: producto.disponible,
        stock: producto.stock,
        inventariable: producto.inventariable,
      }),
      breadcrumbJsonLd([
        { name: 'Catálogo', path: '/' },
        { name: producto.categoria ?? 'Catálogo', path: '/' },
        { name: producto.nombre, path: `/producto/${producto.id}` },
      ]),
    ]
  }, [producto])

  // Un producto inexistente nunca debe dejar una canonical indexable ni ficha
  // JSON-LD: se marca noindex y se elimina el canonical.
  const sinCanonical = noEncontrado || error !== null
  useSeo({
    title: producto
      ? `${producto.nombre} | Tienda Maxan`
      : noEncontrado
        ? 'Producto no encontrado | Tienda Maxan'
        : 'Producto | Tienda Maxan',
    description:
      producto?.descripcion?.slice(0, 160) ||
      (noEncontrado
        ? 'Este producto ya no está en el catálogo de la Tienda Maxan.'
        : DESCRIPCION_GENERICA),
    path: noEncontrado ? '/404' : `/producto/${producto?.id ?? id}`,
    image: producto?.imagenPrincipal ?? undefined,
    imageAlt: producto?.nombre ?? undefined,
    ogType: 'product',
    jsonLd,
    noindex: sinCanonical,
    canonical: sinCanonical ? null : undefined,
  })

  function reintentar() {
    setResultado({ status: 'loading' })
    setIntento((n) => n + 1)
  }

  function agregar() {
    if (!producto) return
    add({
      productoId: producto.id,
      nombre: producto.nombre,
      codigo: producto.codigo,
      precio: producto.precio,
      cantidad: Math.max(1, cantidad),
      unidadMedida: producto.unidadMedida,
    })
    setAgregado(true)
  }

  const sinPrecio = producto ? producto.precio <= 0 : false

  const disponibilidad = !producto
    ? null
    : sinPrecio
      ? { texto: 'Consultar precio', clase: 'badge-info' }
      : producto.disponible
        ? {
            texto: producto.inventariable ? `${producto.stock} en stock` : 'Disponible',
            clase: 'badge-success',
          }
        : {
            texto: producto.inventariable ? 'Agotado' : 'No disponible',
            clase: 'badge-neutral',
          }

  const consulta = producto
    ? {
        id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo,
      }
    : null

  const mensaje = consulta
    ? sinPrecio
      ? mensajeConsultaPrecio(consulta)
      : mensajeConsultaDisponibilidad(consulta)
    : ''

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <nav aria-label="Migas de pan" className="text-sm text-maxan-text-secondary">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="underline-offset-4 hover:text-maxan-navy hover:underline">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-maxan-navy" aria-current="page">
            {producto?.nombre ?? (noEncontrado ? 'Producto no encontrado' : 'Producto')}
          </li>
        </ol>
      </nav>

      {loading && (
        <p role="status" className="mt-8 text-maxan-text-secondary">
          Cargando producto…
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-8 rounded-lg border border-maxan-danger bg-maxan-danger-soft px-4 py-3"
        >
          <p className="text-sm font-medium text-maxan-danger">{error}</p>
          <button type="button" onClick={reintentar} className="btn btn-secondary mt-3 px-4">
            Reintentar
          </button>
        </div>
      )}

      {noEncontrado && (
        <section aria-labelledby="titulo-no-encontrado" className="card mt-8 px-6 py-12 text-center">
          <p className="eyebrow">Producto no encontrado</p>
          <h1
            id="titulo-no-encontrado"
            className="mt-3 text-3xl font-bold tracking-tight text-maxan-navy"
          >
            Este producto ya no está en el catálogo
          </h1>
          <p className="prose-body mx-auto mt-4 max-w-lg">
            Puede que haya cambiado de referencia o que ya no esté a la venta. Escríbenos y te
            ayudamos a encontrar una alternativa.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-primary px-6">
              Ir al catálogo
            </Link>
            <a
              href={waLink(
                `Hola, buscaba un producto en la Tienda Maxan pero la ficha ya no está disponible (${id}). ¿Me pueden ayudar?`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary px-6"
            >
              Consultar por WhatsApp
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
            <Link to="/cotizaciones" className="btn btn-ghost px-6">
              Ver mis cotizaciones
            </Link>
          </div>
        </section>
      )}

      {producto && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <div className="flex h-80 items-center justify-center rounded-xl border border-maxan-border bg-maxan-surface lg:h-96">
              {imgActual ? (
                <img
                  src={imgActual}
                  alt={producto.nombre}
                  width={640}
                  height={480}
                  onLoad={(e) => setOgImageSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-maxan-border-strong"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3 21"></path>
                </svg>
              )}
            </div>

            {imagenes.length > 1 && (
              <div
                role="group"
                aria-label="Imágenes del producto"
                className="mt-3 flex gap-2 overflow-x-auto"
              >
                {imagenes.map((img, idx) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setImgSeleccionada(idx)}
                    aria-pressed={idx === imgSeleccionada}
                    aria-label={`Ver imagen ${idx + 1} de ${imagenes.length}`}
                    className={
                      idx === imgSeleccionada
                        ? 'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-maxan-primary bg-maxan-surface'
                        : 'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-maxan-border bg-maxan-surface hover:border-maxan-border-strong'
                    }
                  >
                    <img src={img.url} alt="" className="h-full w-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-maxan-text-muted">
              {producto.categoria ?? 'General'}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-maxan-navy">
              {producto.nombre}
            </h1>
            {producto.codigo && (
              <p className="mt-2 text-sm text-maxan-text-muted">Referencia {producto.codigo}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <p className="text-3xl font-bold text-maxan-navy">
                {sinPrecio ? 'Precio a consultar' : formatCOP(producto.precio)}
              </p>
              {disponibilidad && (
                <span className={`badge ${disponibilidad.clase}`}>{disponibilidad.texto}</span>
              )}
            </div>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-maxan-border bg-maxan-surface px-4 py-3">
                <dt className="text-sm text-maxan-text-muted">Unidad de medida</dt>
                <dd className="mt-1 font-semibold text-maxan-navy">
                  {producto.unidadMedida || 'Unidad'}
                </dd>
              </div>
              <div className="rounded-lg border border-maxan-border bg-maxan-surface px-4 py-3">
                <dt className="text-sm text-maxan-text-muted">Precio por unidad</dt>
                <dd className="mt-1 font-semibold text-maxan-navy">
                  {sinPrecio ? 'A consultar' : formatCOP(producto.precio)}
                </dd>
              </div>
            </dl>

            {producto.descripcion && (
              <section aria-labelledby="titulo-descripcion" className="mt-8">
                <h2 id="titulo-descripcion" className="text-lg font-bold text-maxan-navy">
                  Descripción
                </h2>
                <p className="prose-body mt-2 whitespace-pre-line">{producto.descripcion}</p>
              </section>
            )}

            <div className="mt-10 border-t border-maxan-border pt-8">
              {producto.disponible && !sinPrecio ? (
                <>
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label htmlFor="cantidad" className="field-label">
                        Cantidad
                      </label>
                      <input
                        id="cantidad"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={cantidad}
                        onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                        className="field-input w-28"
                      />
                    </div>
                    <button type="button" onClick={agregar} className="btn btn-primary px-6">
                      Agregar al carrito
                    </button>
                    <Link to="/carrito" className="btn btn-secondary px-6">
                      Ver carrito
                    </Link>
                  </div>
                  <p role="status" className="mt-3 text-sm font-medium text-maxan-success">
                    {agregado ? `${producto.nombre} se agregó al carrito.` : ''}
                  </p>
                </>
              ) : (
                <section
                  aria-labelledby="titulo-consulta"
                  className="rounded-lg border border-maxan-border bg-maxan-surface-secondary px-5 py-5"
                >
                  <h2 id="titulo-consulta" className="text-lg font-bold text-maxan-navy">
                    {sinPrecio
                      ? 'Este producto se cotiza a medida.'
                      : 'Producto no disponible para cotización en este momento.'}
                  </h2>
                  <p className="prose-body mt-2">
                    {sinPrecio
                      ? `Escríbenos con la referencia ${referenciaProducto(consulta!)} y un asesor te confirma precio, disponibilidad y condiciones de venta.`
                      : 'El stock es informativo y puede cambiar. Escríbenos y te confirmamos disponibilidad y alternativas.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={waLink(mensaje)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary px-5"
                    >
                      Consultar por WhatsApp
                      <span className="sr-only"> (se abre en una pestaña nueva)</span>
                    </a>
                    <a
                      href={mailLinkProducto(
                        `Consulta sobre ${referenciaProducto(consulta!)}`,
                        mensaje,
                      )}
                      className="btn btn-secondary px-5"
                    >
                      Escribir por correo
                    </a>
                    <Link to="/" className="btn btn-ghost px-5">
                      Volver al catálogo
                    </Link>
                  </div>
                  <p className="mt-3 text-sm text-maxan-text-secondary">
                    También puedes escribirnos a {MAIL} o al {WA_DISPLAY}. Un asesor confirma el
                    valor final antes de facturar.
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
