import { vi, describe, it, expect, beforeEach } from 'vitest'
import { forkProject, addLogEntry } from '../lib/projects'

const mockSingle = vi.fn().mockResolvedValue({
  data: { title: 'Original', description: 'Desc', project_type: 'diy', difficulty: 'beginner', tags: ['test'] },
  error: null,
})
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          insert: mockInsert,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockSingle,
              eq: vi.fn(() => ({ single: mockSingle })),
            })),
          })),
        }
      }
      if (table === 'project_log_entries') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'log-1', content: 'test', tag: 'progress', is_public: false, created_at: '2026-01-01' },
                error: null,
              }),
            })),
          })),
        }
      }
      return {}
    }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockInsert.mockResolvedValue({ error: null })
  mockSingle.mockResolvedValue({
    data: { title: 'Original', description: 'Desc', project_type: 'diy', difficulty: 'beginner', tags: ['test'] },
    error: null,
  })
})

describe('forkProject', () => {
  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const result = await forkProject('proj-1')
    expect(result.error).toBeTruthy()
  })

  it('returns error when original project is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    const result = await forkProject('proj-1')
    expect(result.error).toBe('Project not found')
  })

  it('inserts a fork with source=fork and parent_project_id', async () => {
    await forkProject('proj-1')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ parent_project_id: 'proj-1', source: 'fork' }),
    )
  })

  it('appends (fork) to the title', async () => {
    await forkProject('proj-1')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Original (fork)' }),
    )
  })
})

describe('addLogEntry', () => {
  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const result = await addLogEntry({ projectId: 'p1', content: 'test', tag: 'progress', isPublic: false })
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })

  it('inserts log entry and returns the created entry', async () => {
    const result = await addLogEntry({ projectId: 'p1', content: 'Hello', tag: 'progress', isPublic: false })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'log-1', content: 'test' })
  })
})
