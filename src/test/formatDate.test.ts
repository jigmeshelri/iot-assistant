import { describe, it, expect } from 'vitest'
import { formatDate, formatDateShort, formatDateLong } from '../lib/formatDate'

describe('formatDate', () => {
  it('returns em dash for null input', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('formats a date in es-ES short format (day + short month)', () => {
    // 2026-01-15 → "15 ene"
    const result = formatDate('2026-01-15')
    expect(result).toMatch(/15/)
    expect(result.toLowerCase()).toMatch(/ene/)
  })

  it('does not include year in short format', () => {
    const result = formatDate('2026-03-20')
    expect(result).not.toContain('2026')
  })

  it('formats March 20 correctly', () => {
    const result = formatDate('2026-03-20')
    expect(result).toMatch(/20/)
    expect(result.toLowerCase()).toMatch(/mar/)
  })
})

describe('formatDateShort', () => {
  it('includes year in short format', () => {
    const result = formatDateShort('2026-01-15')
    expect(result).toContain('2026')
  })

  it('uses short month name', () => {
    const result = formatDateShort('2026-01-15')
    expect(result.toLowerCase()).toMatch(/ene/)
  })

  it('formats day correctly', () => {
    const result = formatDateShort('2026-01-15')
    expect(result).toMatch(/15/)
  })
})

describe('formatDateLong', () => {
  it('includes year in long format', () => {
    const result = formatDateLong('2026-01-15')
    expect(result).toContain('2026')
  })

  it('uses long month name', () => {
    const result = formatDateLong('2026-01-15')
    expect(result.toLowerCase()).toMatch(/enero/)
  })

  it('formats day and year correctly', () => {
    const result = formatDateLong('2026-01-15')
    expect(result).toMatch(/15/)
    expect(result).toContain('2026')
  })
})
