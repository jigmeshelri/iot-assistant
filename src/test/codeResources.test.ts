import { vi, describe, it, expect, beforeEach } from 'vitest'
import { localMaxVersion, fetchMaxVersion, saveCodeResource, deleteCodeResource } from '../lib/codeResources'
import type { SavedCodeResource } from '../lib/codeResources'

const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()
const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: mockFrom,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function makeResource(filename: string, version: number): SavedCodeResource {
  return {
    id: `id-${version}`, project_id: 'p1', filename,
    language: 'cpp', environment: 'arduino', content: 'x',
    version, parent_id: null, is_generated: true,
    created_at: new Date().toISOString(),
  }
}

describe('fetchMaxVersion', () => {
  it('returns 0 when no rows found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    })
    const result = await fetchMaxVersion('proj-1', 'main.ino')
    expect(result).toBe(0)
  })

  it('returns max version from returned rows', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [{ version: 1 }, { version: 3 }, { version: 2 }], error: null }),
        })),
      })),
    })
    const result = await fetchMaxVersion('proj-1', 'main.ino')
    expect(result).toBe(3)
  })
})

describe('saveCodeResource', () => {
  const opts = { filename: 'main.ino', language: 'cpp', environment: 'arduino', content: '// x', isGenerated: true, parentId: null }

  it('inserts a resource and returns the saved record', async () => {
    const saved = { id: 'r1', filename: 'main.ino', version: 1, language: 'cpp', content: '// x' }
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: saved, error: null }) })),
      })),
    })
    const result = await saveCodeResource('proj-1', opts)
    expect(result).toMatchObject({ id: 'r1', version: 1 })
  })

  it('retries on 23505 conflict and increments version', async () => {
    const saved = { id: 'r2', filename: 'main.ino', version: 2, language: 'cpp', content: '// x' }
    const mockSingleFn = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'conflict' } })
      .mockResolvedValueOnce({ data: saved, error: null })
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: mockSingleFn })),
      })),
    })
    const result = await saveCodeResource('proj-1', opts)
    expect(result.version).toBe(2)
    expect(mockSingleFn).toHaveBeenCalledTimes(2)
  })
})

describe('deleteCodeResource', () => {
  it('deletes a resource without error', async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: null })
    const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
    mockFrom.mockReturnValue({ delete: vi.fn(() => ({ eq: mockEq1 })) })
    await expect(deleteCodeResource('proj-1', 'res-1')).resolves.toBeUndefined()
    expect(mockEq1).toHaveBeenCalledWith('id', 'res-1')
    expect(mockEq2).toHaveBeenCalledWith('project_id', 'proj-1')
  })

  it('throws on error', async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } })
    const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
    mockFrom.mockReturnValue({ delete: vi.fn(() => ({ eq: mockEq1 })) })
    await expect(deleteCodeResource('proj-1', 'res-1')).rejects.toThrow('delete failed')
  })
})

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
