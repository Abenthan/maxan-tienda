import { Routes, Route, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Catalogo from './pages/Catalogo'
import ProductoDetalle from './pages/ProductoDetalle'
import Carrito from './pages/Carrito'
import Cotizaciones from './pages/Cotizaciones'
import NoEncontrada from './pages/NoEncontrada'

/**
 * La clave por id remonta el detalle al cambiar de producto: así la página
 * arranca limpia (imagen, cantidad y estado de carga) sin estados reseteados
 * a mano dentro de un efecto.
 */
function ProductoRoute() {
  const { id } = useParams<{ id: string }>()
  return <ProductoDetalle key={id} />
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/producto/:id" element={<ProductoRoute />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </Layout>
  )
}
