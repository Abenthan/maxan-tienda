import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { redirectToAuthLogin, redirectToAuthRegister } from '../lib/authSso'

const NAV = [
  { to: '/', label: 'Catálogo' },
  { to: '/cotizaciones', label: 'Cotizaciones' },
]

export default function Header() {
  const { user, loading, logout } = useAuth()
  const { count } = useCart()
  const { pathname } = useLocation()

  function currentUrl() {
    return window.location.origin + window.location.pathname + window.location.search
  }

  function esActual(to: string) {
    return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
  }

  return (
    <header className="sticky top-0 z-40 bg-maxan-navy text-white shadow-maxan-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center">
          <img
            src="/images/logo-maxan-blanco.svg"
            alt="Maxan Sistemas"
            width={125}
            height={32}
            className="h-8 w-auto"
          />
        </Link>

        <nav
          aria-label="Principal"
          className="order-last flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={esActual(item.to) ? 'page' : undefined}
              className={
                esActual(item.to)
                  ? 'inline-flex min-h-11 items-center whitespace-nowrap rounded-md bg-white/15 px-3 text-sm font-semibold text-white'
                  : 'inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/carrito"
            className="btn btn-light relative px-3"
            aria-label={`Carrito, ${count} ${count === 1 ? 'artículo' : 'artículos'}`}
          >
            <CartIcon />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-maxan-navy"
              >
                {count}
              </span>
            )}
          </Link>

          {loading ? (
            <span role="status" className="text-sm text-white/70">
              Cargando sesión…
            </span>
          ) : user ? (
            <>
              <span className="hidden text-sm text-white/80 lg:inline">
                Hola, {user.nombres || user.username}
              </span>
              <button type="button" onClick={logout} className="btn btn-light px-3">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => redirectToAuthRegister(currentUrl())}
                className="btn btn-light hidden px-3 sm:inline-flex"
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={() => redirectToAuthLogin(currentUrl())}
                className="btn btn-invert px-3"
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function CartIcon() {
  return (
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
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  )
}
