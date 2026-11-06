/**
 * Canal de contacto de Maxan Sistemas.
 * Espejo de `maxanSistemas.com/frontend/src/lib/wa.js`: el número y el correo
 * son los mismos en todo el ecosistema. Si cambian, cambiar aquí y en la web.
 * El footer del ERP también usa este número en el membrute de reportes.
 */
import { SITE_URL } from './seo'

export const WA_NUMBER = '573134850115'
export const WA_DISPLAY = '+57 313 485 0115'
export const WA_LINK = `https://wa.me/${WA_NUMBER}`
export const MAIL = 'hola@maxansistemas.com'
export const MAIL_LINK = `mailto:${MAIL}`

/** Enlace de WhatsApp con mensaje precargado. */
export function waLink(mensaje = ''): string {
  return mensaje ? `${WA_LINK}?text=${encodeURIComponent(mensaje)}` : WA_LINK
}

export interface ProductoConsulta {
  id: number
  nombre: string
  codigo: string | null
}

/** Referencia estable para que el asesor identifique el producto. */
export function referenciaProducto(producto: ProductoConsulta): string {
  return `${producto.nombre}${producto.codigo ? ` (referencia ${producto.codigo})` : ''}`
}

/** Mensaje listo para pedir el precio de un producto sin precio publicado. */
export function mensajeConsultaPrecio(producto: ProductoConsulta): string {
  return `Hola, quiero consultar el precio y la disponibilidad de ${referenciaProducto(producto)}. Lo vi en la Tienda Maxan: ${SITE_URL}/producto/${producto.id}`
}

/** Mensaje para un producto agotado o no disponible en este momento. */
export function mensajeConsultaDisponibilidad(producto: ProductoConsulta): string {
  return `Hola, quiero consultar la disponibilidad de ${referenciaProducto(producto)}. Lo vi en la Tienda Maxan: ${SITE_URL}/producto/${producto.id}`
}

/** Alternativa por correo cuando WhatsApp no está disponible. */
export function mailLinkProducto(asunto: string, cuerpo: string): string {
  return `${MAIL_LINK}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
}
