import { Link } from 'react-router-dom'

const ENLACES = [
  {
    titulo: 'Tienda',
    items: [
      { to: '/', label: 'Catálogo' },
      { to: '/carrito', label: 'Carrito' },
      { to: '/cotizaciones', label: 'Mis cotizaciones' },
    ],
  },
  {
    titulo: 'Ecosistema Maxan',
    items: [
      { to: 'https://maxansistemas.com', label: 'Sitio corporativo' },
      { to: 'https://erp.maxansistemas.com', label: 'Portal de clientes' },
      { to: 'https://auth.maxansistemas.com', label: 'Cuentas y accesos' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-16 bg-maxan-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <img
              src="/images/logo-maxan-blanco.svg"
              alt="Maxan Sistemas"
              width={125}
              height={32}
              className="h-8 w-auto"
            />
            <p className="mt-4 max-w-sm text-sm text-white/80">
              Equipos, licencias y servicios de tecnología para empresas en Colombia. Pide tu
              cotización en línea y un asesor confirma la venta.
            </p>
          </div>

          {ENLACES.map((columna) => (
            <nav key={columna.titulo} aria-label={columna.titulo}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">
                {columna.titulo}
              </h2>
              <ul className="mt-4 space-y-2">
                {columna.items.map((item) => (
                  <li key={item.to}>
                    {item.to.startsWith('http') ? (
                      <a
                        href={item.to}
                        className="inline-flex min-h-11 items-center text-sm text-white/80 underline-offset-4 hover:text-white hover:underline"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {item.label}
                        <span className="sr-only"> (se abre en una pestaña nueva)</span>
                      </a>
                    ) : (
                      <Link
                        to={item.to}
                        className="inline-flex min-h-11 items-center text-sm text-white/80 underline-offset-4 hover:text-white hover:underline"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-white/15 pt-6 text-sm text-white/70">
          <p className="max-w-3xl">
            Las cotizaciones generadas en línea no son un comprobante de pago. Un asesor de Maxan
            Sistemas confirma disponibilidad, precio final y condiciones de venta antes de
            facturar.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} Maxan Sistemas. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
