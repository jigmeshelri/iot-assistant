import { describe, it, expect, vi } from 'vitest'
import { categoryPrefix, nextAvailableSku } from '../lib/skuUtils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Supabase mock that returns the given SKU rows. */
function buildMock(skus: string[]) {
  const data = skus.map((sku) => ({ sku }))

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        like: vi.fn().mockResolvedValue({ data }),
      }),
    }),
  }
}

// ---------------------------------------------------------------------------
// categoryPrefix
// ---------------------------------------------------------------------------

describe('categoryPrefix', () => {
  it.each([
    ['Microcontrolador', 'MCU'],
    ['Sensor',           'SEN'],
    ['Actuador',         'ACT'],
    ['Alimentación',     'PWR'],
    ['Módulo',           'MOD'],
    ['Pasivo',           'PAS'],
  ])('maps "%s" → "%s"', (category, expected) => {
    expect(categoryPrefix(category)).toBe(expected)
  })

  it('returns GEN for an unknown category', () => {
    expect(categoryPrefix('Desconocida')).toBe('GEN')
  })

  it('returns GEN for an empty string', () => {
    expect(categoryPrefix('')).toBe('GEN')
  })

  it('is case-sensitive — lowercase does not match known categories', () => {
    expect(categoryPrefix('sensor')).toBe('GEN')
    expect(categoryPrefix('microcontrolador')).toBe('GEN')
  })
})

// ---------------------------------------------------------------------------
// nextAvailableSku
// ---------------------------------------------------------------------------

describe('nextAvailableSku', () => {
  it('returns prefix-001 when there are no existing SKUs', async () => {
    const supabase = buildMock([])
    expect(await nextAvailableSku('MCU', supabase)).toBe('MCU-001')
  })

  it('returns prefix-001 when existing SKUs belong to a different prefix', async () => {
    const supabase = buildMock(['SEN-001', 'SEN-002'])
    expect(await nextAvailableSku('MCU', supabase)).toBe('MCU-001')
  })

  it('increments past the highest existing number when there are no gaps', async () => {
    const supabase = buildMock(['MCU-001', 'MCU-002'])
    expect(await nextAvailableSku('MCU', supabase)).toBe('MCU-003')
  })

  it('fills the first gap in a non-contiguous sequence', async () => {
    // MCU-002 was deleted — first free slot is 002
    const supabase = buildMock(['MCU-001', 'MCU-003'])
    expect(await nextAvailableSku('MCU', supabase)).toBe('MCU-002')
  })

  it('ignores SKUs with non-numeric suffixes', async () => {
    const supabase = buildMock(['MCU-ESP32', 'MCU-001'])
    expect(await nextAvailableSku('MCU', supabase)).toBe('MCU-002')
  })

  it('zero-pads numbers to 3 digits (single digit)', async () => {
    const supabase = buildMock([])
    expect(await nextAvailableSku('SEN', supabase)).toBe('SEN-001')
  })

  it('zero-pads numbers to 3 digits (two digits)', async () => {
    const skus = Array.from({ length: 9 }, (_, i) => `MCU-00${i + 1}`)
    const supabase = buildMock(skus)
    expect(await nextAvailableSku('MCU', supabase)).toBe('MCU-010')
  })

  it('handles null data from Supabase without throwing', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          like: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }
    expect(await nextAvailableSku('MOD', supabase)).toBe('MOD-001')
  })

  it('queries the correct table and uses the right LIKE pattern', async () => {
    const supabase = buildMock([])
    await nextAvailableSku('PWR', supabase)

    expect(supabase.from).toHaveBeenCalledWith('components')

    const selectMock = supabase.from.mock.results[0].value.select
    expect(selectMock).toHaveBeenCalledWith('sku')

    const likeMock = selectMock.mock.results[0].value.like
    expect(likeMock).toHaveBeenCalledWith('sku', 'PWR-%')
  })
})
