import { Link } from 'react-router-dom'
import { useSeo } from '../lib/seo'

export default function NoEncontrada() {
  useSeo({
    title: 'Página no encontrada | Tienda Maxan',
    description: 'La página que buscas no existe o cambió de dirección.',
    path: '/404',
    noindex: true,
  })

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:py-24">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-maxan-navy sm:text-4xl">
        No encontramos esta página
      </h1>
      <p className="prose-body mx-auto mt-4 max-w-lg">
        Puede que el enlace esté equivocado o que el producto ya no esté en el catálogo. Vuelve al
        catálogo para seguir comprando.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary px-6">
          Ir al catálogo
        </Link>
        <Link to="/cotizaciones" className="btn btn-secondary px-6">
          Ver mis cotizaciones
        </Link>
      </div>
    </div>
  )
}
