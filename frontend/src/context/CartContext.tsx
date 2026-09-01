import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'

export interface CartItem {
  productoId: number
  nombre: string
  codigo: string
  precio: number
  cantidad: number
  unidadMedida: string | null
}

interface CartContextType {
  items: CartItem[]
  add: (item: Omit<CartItem, 'cantidad'> & { cantidad?: number }) => void
  remove: (productoId: number) => void
  setCantidad: (productoId: number, cantidad: number) => void
  clear: () => void
  total: number
  count: number
}

const STORAGE_KEY = 'maxan_tienda_carrito'

const CartContext = createContext<CartContextType | null>(null)

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const add = useCallback((item: Omit<CartItem, 'cantidad'> & { cantidad?: number }) => {
    const cantidad = item.cantidad ?? 1
    setItems((prev) => {
      const existing = prev.find((it) => it.productoId === item.productoId)
      if (existing) {
        return prev.map((it) =>
          it.productoId === item.productoId ? { ...it, cantidad: it.cantidad + cantidad } : it,
        )
      }
      return [...prev, { productoId: item.productoId, nombre: item.nombre, codigo: item.codigo, precio: item.precio, cantidad, unidadMedida: item.unidadMedida }]
    })
  }, [])

  const remove = useCallback((productoId: number) => {
    setItems((prev) => prev.filter((it) => it.productoId !== productoId))
  }, [])

  const setCantidad = useCallback((productoId: number, cantidad: number) => {
    setItems((prev) => {
      if (cantidad <= 0) return prev.filter((it) => it.productoId !== productoId)
      return prev.map((it) => (it.productoId === productoId ? { ...it, cantidad } : it))
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const { total, count } = useMemo(() => {
    const total = items.reduce((acc, it) => acc + it.precio * it.cantidad, 0)
    const count = items.reduce((acc, it) => acc + it.cantidad, 0)
    return { total, count }
  }, [items])

  return (
    <CartContext.Provider value={{ items, add, remove, setCantidad, clear, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}