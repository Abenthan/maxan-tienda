import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import type { Producto } from '../lib/api'
import { formatCOP } from '../lib/format'
import { mensajeConsultaPrecio, waLink } from '../lib/wa'

export default function ProductCard({ producto }: { producto: Producto }) {
  const { add } = useCart()
  const [agregado, setAgregado] = useState(false)

  const sinPrecio = producto.precio <= 0

  useEffect(() => {
    if (!agregado) return
    const timer = window.setTimeout(() => setAgregado(false), 2500)
    return () => window.clearTimeout(timer)
  }, [agregado])

  function agregar() {
    add({
      productoId: producto.id,
      nombre: producto.nombre,
      codigo: producto.codigo,
      precio: producto.precio,
      unidadMedida: producto.unidadMedida,
    })
    setAgregado(true)
  }

  // Maxan vende sin inventario propio: la tarjeta solo distingue precio
  // publicado (se agrega al carrito) de precio por consultar (WhatsApp).
  // Nunca se muestra "Agotado": el stock del ERP no participa en la tienda.
  const badge = sinPrecio
    ? { texto: 'Consultar precio', clase: 'badge-info' }
    : producto.destacado
      ? { texto: 'Destacado', clase: 'badge-brand' }
      : null

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="relative flex h-48 items-center justify-center bg-maxan-surface-secondary">
        <Link
          to={`/producto/${producto.id}`}
          tabIndex={-1}
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center"
        >
          {producto.imagenPrincipal ? (
            <img
              src={producto.imagenPrincipal}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-48 w-full object-contain p-3"
            />
          ) : (
            <ImagePlaceholder />
          )}
        </Link>

        {badge && (
          <span className={`badge ${badge.clase} absolute left-3 top-3`}>{badge.texto}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-maxan-text-muted">
            {producto.categoria ?? 'General'}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-maxan-navy">
            <Link
              to={`/producto/${producto.id}`}
              className="underline-offset-4 hover:text-maxan-primary hover:underline"
            >
              {producto.nombre}
            </Link>
          </h3>
        </div>

        <p className="text-lg font-bold text-maxan-navy">
          {sinPrecio ? 'Precio a consultar' : formatCOP(producto.precio)}
        </p>

        <div className="mt-auto space-y-2">
          {sinPrecio ? (
            <>
              <a
                href={waLink(mensajeConsultaPrecio(producto))}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Consultar el precio de ${producto.nombre} por WhatsApp (se abre en una pestaña nueva)`}
                className="btn btn-primary w-full px-3"
              >
                Consultar precio
              </a>
              <Link to={`/producto/${producto.id}`} className="btn btn-secondary w-full px-3">
                Ver ficha del producto
              </Link>
            </>
          ) : (
            <button type="button" onClick={agregar} className="btn btn-primary w-full px-3">
              {agregado ? 'Agregado' : 'Agregar al carrito'}
            </button>
          )}
          <span role="status" className="sr-only">
            {agregado ? `${producto.nombre} agregado al carrito` : ''}
          </span>
        </div>
      </div>
    </article>
  )
}

function ImagePlaceholder() {
  return (
    <svg
      width="56"
      height="56"
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
  )
}
