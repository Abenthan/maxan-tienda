/** Formateadores compartidos por la tienda (es-CO). */

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

export function formatCOP(valor: number): string {
  return COP.format(valor)
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatFecha(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : FECHA_CORTA.format(d)
}

export function formatFechaHora(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : FECHA_HORA.format(d)
}
