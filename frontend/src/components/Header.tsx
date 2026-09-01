import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { redirectToAuthLogin, redirectToAuthRegister } from '../lib/authSso'

export default function Header() {
  const { user, loading, logout } = useAuth()

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