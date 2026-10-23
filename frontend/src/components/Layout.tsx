import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'

/**
 * Cascarón compartido por todas las páginas: skip link, encabezado, contenido
 * principal y pie. El ancla `#contenido` es el destino del enlace "Saltar al
 * contenido" (WCAG 2.4.1) y el punto de entrada del `main` para lectores de
 * pantalla.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-maxan-bg">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <ScrollToTop />
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
