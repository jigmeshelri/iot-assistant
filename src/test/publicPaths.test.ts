import { describe, expect, it } from 'vitest'
import { isPublicPath } from '../lib/publicPaths'

describe('isPublicPath', () => {
  it('allows /api/ai/* (handlers do their own Bearer auth)', () => {
    expect(isPublicPath('/api/ai/recognize')).toBe(true)
    expect(isPublicPath('/api/ai/code/analyze')).toBe(true)
  })

  it('allows /api/qr/* (unauthenticated by design, like the Python endpoint)', () => {
    expect(isPublicPath('/api/qr/LOC-ABC')).toBe(true)
  })

  it('allows the existing public pages', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/community')).toBe(true)
    expect(isPublicPath('/l/ABC123')).toBe(true)
    expect(isPublicPath('/auth/callback')).toBe(true)
  })

  it('keeps protected pages gated', () => {
    expect(isPublicPath('/inventory')).toBe(false)
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/api/other')).toBe(false)
  })
})
