const PREFIXES: Record<string, string> = {
  'Microcontrolador': 'MCU',
  'Sensor':           'SEN',
  'Actuador':         'ACT',
  'Alimentación':     'PWR',
  'Módulo':           'MOD',
  'Pasivo':           'PAS',
}

export function categoryPrefix(category: string): string {
  return PREFIXES[category] ?? 'GEN'
}

/**
 * Retorna el primer SKU disponible para el prefijo dado.
 * Consulta Supabase en tiempo real — no usar el estado local del formulario.
 */
export async function nextAvailableSku(
  prefix: string,
  // Aceptamos cualquier objeto con .from() para facilitar el testing
  supabase: { from: (table: string) => any },
): Promise<string> {
  const { data } = await supabase
    .from('components')
    .select('sku')
    .like('sku', `${prefix}-%`)

  const usedNumbers = new Set(
    (data ?? [])
      .map((r: { sku: string }) => parseInt(r.sku.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n) && n > 0)
  )

  let n = 1
  while (usedNumbers.has(n)) n++
  return `${prefix}-${String(n).padStart(3, '0')}`
}
