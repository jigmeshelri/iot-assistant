import { describe, it, expect } from 'vitest'
import { localMaxVersion } from '../lib/codeResources'
import type { SavedCodeResource } from '../lib/codeResources'

function makeResource(filename: string, version: number): SavedCodeResource {
  return {
    id: `id-${version}`, project_id: 'p1', filename,
    language: 'cpp', environment: 'arduino', content: 'x',
    version, parent_id: null, is_generated: true,
    created_at: new Date().toISOString(),
  }
}

describe('localMaxVersion', () => {
  it('returns 0 when no resources', () => {
    expect(localMaxVersion([], 'main.ino')).toBe(0)
  })

  it('returns 0 when filename not found', () => {
    expect(localMaxVersion([makeResource('other.ino', 3)], 'main.ino')).toBe(0)
  })

  it('returns max version for filename', () => {
    const resources = [
      makeResource('main.ino', 1),
      makeResource('main.ino', 3),
      makeResource('main.ino', 2),
      makeResource('sensor.cpp', 5),
    ]
    expect(localMaxVersion(resources, 'main.ino')).toBe(3)
  })
})
