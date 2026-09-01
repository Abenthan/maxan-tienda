import { Routes, Route, Navigate } from 'react-router-dom'
import Catalogo from './pages/Catalogo'
import ProductoDetalle from './pages/ProductoDetalle'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Catalogo />} />
      <Route path="/producto/:id" element={<ProductoDetalle />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
