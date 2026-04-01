import { describe, it, expect } from 'vitest'
import { DIFFICULTY, PROJECT_STATUS, categoryColors, CATEGORIES, PLATFORMS } from '../lib/constants'

describe('DIFFICULTY', () => {
  it('has beginner, intermediate and advanced keys', () => {
    expect(Object.keys(DIFFICULTY)).toEqual(['beginner', 'intermediate', 'advanced'])
  })

  it('beginner label is Principiante', () => {
    expect(DIFFICULTY.beginner.label).toBe('Principiante')
  })

  it('intermediate label is Intermedio', () => {
    expect(DIFFICULTY.intermediate.label).toBe('Intermedio')
  })

  it('advanced label is Avanzado', () => {
    expect(DIFFICULTY.advanced.label).toBe('Avanzado')
  })

  it('each entry has a badge class string', () => {
    for (const key of Object.keys(DIFFICULTY) as Array<keyof typeof DIFFICULTY>) {
      expect(typeof DIFFICULTY[key].badge).toBe('string')
      expect(DIFFICULTY[key].badge.length).toBeGreaterThan(0)
    }
  })
})

describe('PROJECT_STATUS', () => {
  it('has saved, in_progress, paused, completed and abandoned keys', () => {
    expect(Object.keys(PROJECT_STATUS)).toEqual(['saved', 'in_progress', 'paused', 'completed', 'abandoned'])
  })

  it('in_progress label is En progreso', () => {
    expect(PROJECT_STATUS.in_progress.label).toBe('En progreso')
  })

  it('each entry has label and badge strings', () => {
    for (const key of Object.keys(PROJECT_STATUS) as Array<keyof typeof PROJECT_STATUS>) {
      expect(typeof PROJECT_STATUS[key].label).toBe('string')
      expect(typeof PROJECT_STATUS[key].badge).toBe('string')
    }
  })
})

describe('categoryColors', () => {
  it('has entries for all main categories', () => {
    const expected = ['Microcontrolador', 'Sensor', 'Actuador', 'Alimentación', 'Módulo', 'Pasivo']
    for (const cat of expected) {
      expect(categoryColors[cat]).toBeDefined()
    }
  })

  it('each entry has bg and icon strings', () => {
    for (const key of Object.keys(categoryColors)) {
      expect(typeof categoryColors[key].bg).toBe('string')
      expect(typeof categoryColors[key].icon).toBe('string')
    }
  })

  it('Microcontrolador uses brand color', () => {
    expect(categoryColors['Microcontrolador'].bg).toContain('brand')
    expect(categoryColors['Microcontrolador'].icon).toContain('brand')
  })
})

describe('CATEGORIES', () => {
  it('contains all 6 expected categories', () => {
    expect(CATEGORIES).toEqual(['Microcontrolador','Sensor','Alimentación','Actuador','Módulo','Pasivo'])
  })

  it('is a readonly tuple', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true)
    expect(CATEGORIES.length).toBe(6)
  })
})

describe('PLATFORMS', () => {
  it('contains all 8 expected platforms', () => {
    expect(PLATFORMS).toEqual(['ESP32','ESP8266','RP2040','STM32','AVR','nRF52','SAMD','Other'])
  })

  it('is a readonly tuple', () => {
    expect(Array.isArray(PLATFORMS)).toBe(true)
    expect(PLATFORMS.length).toBe(8)
  })
})
