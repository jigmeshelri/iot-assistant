import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module-level Supabase mock
// ---------------------------------------------------------------------------

const mockLike = vi.fn()
const mockSelect = vi.fn(() => ({ like: mockLike }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({ from: mockFrom }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSelect.mockImplementation(() => ({ like: mockLike }))
  mockFrom.mockImplementation(() => ({ select: mockSelect }))
})

/** Configure the mock to resolve with the given SKU rows. */
function withSkus(skus: string[]): void {
  mockLike.mockResolvedValueOnce({ data: skus.map((sku) => ({ sku })) })
}

import { categoryPrefix, nextAvailableSku } from '../lib/skuUtils'

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
    withSkus([])
    expect(await nextAvailableSku('MCU')).toBe('MCU-001')
  })

  it('returns prefix-001 when existing SKUs belong to a different prefix', async () => {
    withSkus(['SEN-001', 'SEN-002'])
    expect(await nextAvailableSku('MCU')).toBe('MCU-001')
  })

  it('increments past the highest existing number when there are no gaps', async () => {
    withSkus(['MCU-001', 'MCU-002'])
    expect(await nextAvailableSku('MCU')).toBe('MCU-003')
  })

  it('fills the first gap in a non-contiguous sequence', async () => {
    withSkus(['MCU-001', 'MCU-003'])
    expect(await nextAvailableSku('MCU')).toBe('MCU-002')
  })

  it('ignores SKUs with non-numeric suffixes', async () => {
    withSkus(['MCU-ESP32', 'MCU-001'])
    expect(await nextAvailableSku('MCU')).toBe('MCU-002')
  })

  it('zero-pads numbers to 3 digits (single digit)', async () => {
    withSkus([])
    expect(await nextAvailableSku('SEN')).toBe('SEN-001')
  })

  it('zero-pads numbers to 3 digits (two digits)', async () => {
    withSkus(Array.from({ length: 9 }, (_, i) => `MCU-00${i + 1}`))
    expect(await nextAvailableSku('MCU')).toBe('MCU-010')
  })

  it('handles null data from Supabase without throwing', async () => {
    mockLike.mockResolvedValueOnce({ data: null })
    expect(await nextAvailableSku('MOD')).toBe('MOD-001')
  })

  it('queries the correct table and uses the right LIKE pattern', async () => {
    withSkus([])
    await nextAvailableSku('PWR')
    expect(mockFrom).toHaveBeenCalledWith('components')
    expect(mockSelect).toHaveBeenCalledWith('sku')
    expect(mockLike).toHaveBeenCalledWith('sku', 'PWR-%')
  })
})
