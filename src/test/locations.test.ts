import { vi, describe, it, expect, beforeEach } from 'vitest'
import { insertLocation } from '../lib/locations'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockGetUser = vi.fn()

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
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

  it('throws when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(insertLocation('Test')).rejects.toThrow('Not authenticated')
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
