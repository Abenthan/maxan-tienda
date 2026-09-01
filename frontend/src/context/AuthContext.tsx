import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { AUTH_DELEGATED, fetchAuthSession, fetchAuthMe, authLogout, type SsoUser } from '../lib/authSso'

interface AuthContextType {
  user: SsoUser | null
  token: string | null
  loading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function initialToken(): string | null {
  const stored = localStorage.getItem('token')
  if (stored) return stored
  const params = new URLSearchParams(window.location.search)
  const urlToken = params.get('token')
  if (urlToken) return urlToken
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SsoUser | null>(null)
  const [token, setToken] = useState<string | null>(initialToken)
  const [loading, setLoading] = useState(true)

  // Limpia el token de la URL tras el redirect de SSO (sin tocar estado).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('token')) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    }
  }, [])

  // Resolución de sesión: token presente → valida /auth/me; sin token y delegado
  // → restaura por cookie; sin token y no delegado → fin. Todo async (sin setState síncrono).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (token) {
          const u = await fetchAuthMe(token)
          if (cancelled) return
          localStorage.setItem('token', token)
          setUser(u)
        } else if (AUTH_DELEGATED) {
          const res = await fetchAuthSession()
          if (cancelled) return
          localStorage.setItem('token', res.token)
          setToken(res.token)
          setUser(res.user)
        }
      } catch {
        if (cancelled) return
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [token])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    if (AUTH_DELEGATED) {
      authLogout()
    }
  }, [])

  return <AuthContext.Provider value={{ user, token, loading, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}