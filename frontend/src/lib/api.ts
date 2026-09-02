import axios from 'axios'
import { AUTH_DELEGATED, redirectToAuthLogin } from './authSso'

export interface Producto {
  id: number
  codigo: string
  nombre: string
  categoria: string | null
  unidadMedida: string | null
  inventariable: boolean
  precio: number
  destacado: boolean
  descripcion: string | null
  stock: number
  disponible: boolean
  imagenPrincipal: string | null
  imagenes?: { url: string; esPrincipal: boolean; orden: number }[]
}

export type Categoria = string

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (AUTH_DELEGATED) {
        redirectToAuthLogin(window.location.origin + window.location.pathname + window.location.search)
      }
    }
    return Promise.reject(error)
  },
)

export async function fetchProductos(): Promise<Producto[]> {
  const { data } = await api.get<Producto[]>('/catalogo/productos')
  return data
}

export async function fetchProducto(id: string | number): Promise<Producto> {
  const { data } = await api.get<Producto>(`/catalogo/productos/${id}`)
  return data
}

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>('/catalogo/categorias')
  return data
}

export interface PedidoItem {
  id: number
  productoId: number | null
  codigo: string
  nombre: string
  unidadMedida: string | null
  cantidad: number
  precio: number
  subtotal: number
}

export interface Pedido {
  id: number
  estado: 'pendiente' | 'confirmada' | 'cancelada'
  observaciones: string | null
  createdAt: string
  total: number
  items: PedidoItem[]
}

export interface CrearPedidoInput {
  observaciones?: string | null
  items: { productoId: number; cantidad: number }[]
}

export async function crearPedido(input: CrearPedidoInput): Promise<Pedido> {
  const { data } = await api.post<Pedido>('/pedidos', input)
  return data
}

export async function fetchPedidos(): Promise<Pedido[]> {
  const { data } = await api.get<Pedido[]>('/pedidos')
  return data
}

export async function fetchPedido(id: number): Promise<Pedido> {
  const { data } = await api.get<Pedido>(`/pedidos/${id}`)
  return data
}

export async function cancelarPedido(id: number): Promise<Pedido> {
  const { data } = await api.post<Pedido>(`/pedidos/${id}/cancelar`)
  return data
}

export { api }