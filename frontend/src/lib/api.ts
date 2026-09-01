import axios from 'axios'

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
}

export type Categoria = string

const api = axios.create({
  baseURL: '/api',
})

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

export { api }