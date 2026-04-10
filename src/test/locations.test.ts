import { vi, describe, it, expect, beforeEach } from 'vitest'
import { insertLocation, buildTree } from '../lib/locations'

const mockSelectAfterInsert = vi.fn().mockResolvedValue({ data: [{ id: 'new-loc-id' }], error: null })
const mockInsert = vi.fn(() => ({ select: mockSelectAfterInsert }))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockGetCurrentUserId = vi.fn()

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('../lib/auth', () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCurrentUserId.mockResolvedValue('user-1')
  mockSelectAfterInsert.mockResolvedValue({ data: [{ id: 'new-loc-id' }], error: null })
  mockInsert.mockReturnValue({ select: mockSelectAfterInsert })
  mockFrom.mockReturnValue({ insert: mockInsert })
})

describe('buildTree', () => {
  it('returns an empty map for an empty array', () => {
    const result = buildTree([])
    expect(result.size).toBe(0)
  })

  it('groups root locations (no parent) under null key', () => {
    const locs = [
      { id: 'a', name: 'A', parent_id: null },
      { id: 'b', name: 'B', parent_id: null },
    ]
    const result = buildTree(locs)
    expect(result.get(null)).toHaveLength(2)
    expect(result.get(null)!.map(l => l.id)).toEqual(['a', 'b'])
  })

  it('groups children under their parent key', () => {
    const locs = [
      { id: 'root', name: 'Root', parent_id: null },
      { id: 'child1', name: 'Child1', parent_id: 'root' },
      { id: 'child2', name: 'Child2', parent_id: 'root' },
    ]
    const result = buildTree(locs)
    expect(result.get(null)).toHaveLength(1)
    expect(result.get('root')).toHaveLength(2)
    expect(result.get('root')!.map(l => l.id)).toEqual(['child1', 'child2'])
  })

  it('handles multi-level nesting', () => {
    const locs = [
      { id: 'r', name: 'Root', parent_id: null },
      { id: 'c', name: 'Child', parent_id: 'r' },
      { id: 'gc', name: 'Grandchild', parent_id: 'c' },
    ]
    const result = buildTree(locs)
    expect(result.get(null)!.map(l => l.id)).toEqual(['r'])
    expect(result.get('r')!.map(l => l.id)).toEqual(['c'])
    expect(result.get('c')!.map(l => l.id)).toEqual(['gc'])
  })
})

describe('insertLocation', () => {
  it('inserts a root location with trimmed name and user_id', async () => {
    await insertLocation('  Taller  ')
    expect(mockFrom).toHaveBeenCalledWith('locations')
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-1', name: 'Taller' })
  })

  it('includes parent_id when provided', async () => {
    await insertLocation('Rack', 'loc-parent')
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-1', name: 'Rack', parent_id: 'loc-parent' })
  })

  it('returns the id of the newly created location', async () => {
    const id = await insertLocation('Taller')
    expect(id).toBe('new-loc-id')
  })

  it('returns null when insert returns no data', async () => {
    mockSelectAfterInsert.mockResolvedValueOnce({ data: [], error: null })
    const id = await insertLocation('Empty')
    expect(id).toBeNull()
  })

  it('throws when user is not authenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null)
    await expect(insertLocation('Test')).rejects.toThrow('Not authenticated')
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
