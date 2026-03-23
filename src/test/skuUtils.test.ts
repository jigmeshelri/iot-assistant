import { describe, it, expect, vi } from 'vitest'
import { categoryPrefix, nextAvailableSku } from '../lib/skuUtils'

function makeSupabase(existingSkus: string[]) {
  return {
    from: () => ({
      select: () => ({
        like: () => Promise.resolve({
          data: existingSkus.map(sku => ({ sku })),
          error: null,
        }),
      }),
    }),
  } as any
}

describe('categoryPrefix', () => {
  it('devuelve prefijo correcto para cada categoría', () => {
    expect(categoryPrefix('Microcontrolador')).toBe('MCU')
    expect(categoryPrefix('Sensor')).toBe('SEN')
    expect(categoryPrefix('Actuador')).toBe('ACT')
    expect(categoryPrefix('Alimentación')).toBe('PWR')
    expect(categoryPrefix('Módulo')).toBe('MOD')
    expect(categoryPrefix('Pasivo')).toBe('PAS')
  })

  it('devuelve GEN para categoría desconocida', () => {
    expect(categoryPrefix('Desconocida')).toBe('GEN')
  })
})

describe('nextAvailableSku', () => {
  it('retorna MCU-001 cuando no hay SKUs', async () => {
    const result = await nextAvailableSku('MCU', makeSupabase([]))
    expect(result).toBe('MCU-001')
  })

  it('retorna el primer número libre (sin gaps)', async () => {
    const result = await nextAvailableSku('MCU', makeSupabase(['MCU-001', 'MCU-002']))
    expect(result).toBe('MCU-003')
  })

  it('salta gaps dejados por eliminaciones', async () => {
    // MCU-002 fue eliminado → primer libre es MCU-002
    const result = await nextAvailableSku('MCU', makeSupabase(['MCU-001', 'MCU-003']))
    expect(result).toBe('MCU-002')
  })

  it('ignora SKUs manuales que no siguen el patrón numérico', async () => {
    const result = await nextAvailableSku('MCU', makeSupabase(['MCU-ESP32', 'MCU-001']))
    expect(result).toBe('MCU-002')
  })

  it('formatea con padding de 3 dígitos', async () => {
    const skus = Array.from({ length: 9 }, (_, i) => `MCU-00${i + 1}`)
    const result = await nextAvailableSku('MCU', makeSupabase(skus))
    expect(result).toBe('MCU-010')
  })
})
