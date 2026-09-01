import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { redirectToAuthLogin, redirectToAuthRegister } from '../lib/authSso'

export default function Header() {
  const { user, loading, logout } = useAuth()
  const { count } = useCart()

  function currentUrl() {
    return window.location.origin + window.location.pathname + window.location.search
  }

  return (
    <header className="bg-navy text-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="font-bold text-lg">
          Tienda Maxan
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/carrito"
            className="relative flex items-center gap-2 text-sm text-white/80 hover:text-white border border-white/30 px-3 py-1.5 rounded"
            aria-label={`Carrito, ${count} artículos`}
          >
            <CartIcon />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          {loading ? (
            <span className="text-sm text-white/50">Cargando sesión…</span>
          ) : user ? (
            <>
              <span className="text-sm text-white/80 hidden sm:inline">
                Hola, {user.nombres || user.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-white/80 hover:text-white border border-white/30 px-3 py-1 rounded"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => redirectToAuthRegister(currentUrl())}
                className="text-sm text-white/80 hover:text-white"
              >
                Registrarse
              </button>
              <button
                onClick={() => redirectToAuthLogin(currentUrl())}
                className="text-sm bg-brand text-white px-4 py-2 rounded-lg font-semibold"
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