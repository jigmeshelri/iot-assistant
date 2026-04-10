import { createSupabaseBrowserClient } from './supabase'

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
 * Returns the first available SKU for the given prefix.
 * Queries Supabase in real time — do not rely on local form state.
 */
export async function nextAvailableSku(prefix: string): Promise<string> {
  const supabase = createSupabaseBrowserClient()
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
