/** Format a date string in es-ES short format without year: "15 ene" */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** Format a date string in es-ES short format with year: "15 ene 2026" */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Format a date string in es-ES long format with year: "15 de enero de 2026" */
export function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
