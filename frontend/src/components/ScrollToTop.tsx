import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Restaura el scroll al navegar dentro de la SPA (si no, cada ruta hereda la
 * posición de la anterior). Se ignora cuando hay hash para no romper los
 * enlaces a anclas.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}
