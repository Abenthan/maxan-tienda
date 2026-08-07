import { Routes, Route, Navigate } from 'react-router-dom'
import Catalogo from './pages/Catalogo'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Catalogo />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
