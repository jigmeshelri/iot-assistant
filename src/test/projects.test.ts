import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Shared mock state ───────────────────────────────────────────────────────

const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: 'new-1' }, error: null }),
  }),
})
const mockSingle = vi.fn().mockResolvedValue({
  data: { title: 'Original', description: 'Desc', project_type: 'diy', difficulty: 'beginner', tags: ['test'] },
  error: null,
})
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })

const mockLogUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const mockLogInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: { id: 'log-1', content: 'test', tag: 'progress', is_public: false, created_at: '2026-01-01' },
      error: null,
    }),
  }),
})

const mockBomInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          update: mockUpdate,
          delete: mockDelete,
          insert: mockInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }
      }
      if (table === 'project_log_entries') {
        return {
          update: mockLogUpdate,
          insert: mockLogInsert,
        }
      }
      if (table === 'project_bom') {
        return { insert: mockBomInsert }
      }
      return {}
    }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'new-1' }, error: null }),
    }),
  })
  mockSingle.mockResolvedValue({
    data: { title: 'Original', description: 'Desc', project_type: 'diy', difficulty: 'beginner', tags: ['test'] },
    error: null,
  })
  mockLogUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockBomInsert.mockResolvedValue({ error: null })
})

// ─── updateProjectField ──────────────────────────────────────────────────────

describe('updateProjectField', () => {
  it('updates fields and returns no error on success', async () => {
    const { updateProjectField } = await import('../lib/projects')
    const result = await updateProjectField('proj-1', { title: 'New Title' })
    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('returns error when update fails', async () => {
    mockUpdate.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    })
    const { updateProjectField } = await import('../lib/projects')
    const result = await updateProjectField('proj-1', { title: 'X' })
    expect(result.error?.message).toBe('Update failed')
  })
})

// ─── deleteProject ───────────────────────────────────────────────────────────

describe('deleteProject', () => {
  it('deletes project and returns no error on success', async () => {
    const { deleteProject } = await import('../lib/projects')
    const result = await deleteProject('proj-1')
    expect(result.error).toBeNull()
    expect(mockDelete).toHaveBeenCalled()
  })

  it('returns error when delete fails', async () => {
    mockDelete.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
    })
    const { deleteProject } = await import('../lib/projects')
    const result = await deleteProject('proj-1')
    expect(result.error?.message).toBe('Delete failed')
  })
})

// ─── createProject ───────────────────────────────────────────────────────────

describe('createProject', () => {
  it('creates project with correct fields when authenticated', async () => {
    const { createProject } = await import('../lib/projects')
    const result = await createProject({
      title: 'Mi Proyecto',
      description: 'Desc',
      projectType: 'diy',
      difficulty: 'beginner',
    })
    expect(result.data).toEqual({ id: 'new-1' })
    expect(result.error).toBeNull()
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { createProject } = await import('../lib/projects')
    const result = await createProject({
      title: 'X',
      description: null,
      projectType: 'diy',
      difficulty: 'beginner',
    })
    expect(result.data).toBeNull()
    expect(result.error?.message).toBe('Not authenticated')
  })

  it('returns error when insert fails', async () => {
    mockInsert.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    })
    const { createProject } = await import('../lib/projects')
    const result = await createProject({
      title: 'X',
      description: null,
      projectType: 'diy',
      difficulty: 'beginner',
    })
    expect(result.error?.message).toBe('DB error')
  })
})

// ─── publishProject ──────────────────────────────────────────────────────────

describe('publishProject', () => {
  it('publishes project and updates log visibility', async () => {
    const { publishProject } = await import('../lib/projects')
    const result = await publishProject('proj-1', {
      title: 'Public Title',
      description: 'Desc',
      difficulty: 'beginner',
      tags: ['iot'],
    }, [
      { id: 'log-1', is_public: true },
      { id: 'log-2', is_public: false },
    ])
    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockLogUpdate).toHaveBeenCalledTimes(2)
  })

  it('returns error when project update fails', async () => {
    mockUpdate.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ error: { message: 'Publish failed' } }),
    })
    const { publishProject } = await import('../lib/projects')
    const result = await publishProject('proj-1', {
      title: 'X',
      description: null,
      difficulty: 'beginner',
      tags: [],
    }, [])
    expect(result.error?.message).toBe('Publish failed')
  })
})

// ─── unpublishProject ────────────────────────────────────────────────────────

describe('unpublishProject', () => {
  it('sets is_public to false', async () => {
    const { unpublishProject } = await import('../lib/projects')
    const result = await unpublishProject('proj-1')
    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('returns error on failure', async () => {
    mockUpdate.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ error: { message: 'Unpublish failed' } }),
    })
    const { unpublishProject } = await import('../lib/projects')
    const result = await unpublishProject('proj-1')
    expect(result.error?.message).toBe('Unpublish failed')
  })
})

// ─── saveAIProject ───────────────────────────────────────────────────────────

describe('saveAIProject', () => {
  it('creates AI project with correct fields', async () => {
    const { saveAIProject } = await import('../lib/projects')
    const result = await saveAIProject({
      title: 'AI Project',
      description: 'Generated',
      source: 'ai_plan',
      difficulty: 'intermediate',
      tags: ['iot', 'esp32'],
    })
    expect(result.data).toEqual({ id: 'new-1' })
    expect(result.error).toBeNull()
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { saveAIProject } = await import('../lib/projects')
    const result = await saveAIProject({
      title: 'X',
      description: 'X',
      source: 'ai_plan',
      difficulty: null,
      tags: [],
    })
    expect(result.data).toBeNull()
    expect(result.error?.message).toBe('No autenticado')
  })

  it('persists BOM items into project_bom when provided', async () => {
    const { saveAIProject } = await import('../lib/projects')
    const result = await saveAIProject({
      title: 'AI Project',
      description: 'Generated',
      source: 'ai_plan',
      difficulty: 'intermediate',
      tags: ['iot'],
      bom: [
        { component_name: 'ESP32', quantity_required: 1, notes: 'wifi' },
        { component_name: 'DHT22', quantity_required: 2 },
      ],
    })
    expect(result.error).toBeNull()
    expect(mockBomInsert).toHaveBeenCalledTimes(1)
    const rows = mockBomInsert.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      project_id: 'new-1',
      component_name: 'ESP32',
      quantity_required: 1,
      notes: 'wifi',
    })
    expect(rows[1]).toMatchObject({
      project_id: 'new-1',
      component_name: 'DHT22',
      quantity_required: 2,
    })
  })

  it('skips BOM insert when bom is empty or omitted', async () => {
    const { saveAIProject } = await import('../lib/projects')
    await saveAIProject({
      title: 'AI Project',
      description: 'Generated',
      source: 'ai_plan',
      difficulty: null,
      tags: [],
      bom: [],
    })
    expect(mockBomInsert).not.toHaveBeenCalled()
  })

  it('skips BOM items without a component_name', async () => {
    const { saveAIProject } = await import('../lib/projects')
    await saveAIProject({
      title: 'AI Project',
      description: 'Generated',
      source: 'ai_plan',
      difficulty: null,
      tags: [],
      bom: [
        { component_name: '', quantity_required: 1 },
        { component_name: '  ', quantity_required: 1 },
        { component_name: 'ESP32', quantity_required: 1 },
      ],
    })
    expect(mockBomInsert).toHaveBeenCalledTimes(1)
    const rows = mockBomInsert.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ component_name: 'ESP32' })
  })
})

// ─── forkProject ─────────────────────────────────────────────────────────────

describe('forkProject', () => {
  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { forkProject } = await import('../lib/projects')
    const result = await forkProject('proj-1')
    expect(result.error).toBeTruthy()
  })

  it('returns error when original project is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    const { forkProject } = await import('../lib/projects')
    const result = await forkProject('proj-1')
    expect(result.error).toBe('Project not found')
  })

  it('inserts a fork with source=fork and parent_project_id', async () => {
    const { forkProject } = await import('../lib/projects')
    await forkProject('proj-1')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ parent_project_id: 'proj-1', source: 'fork' }),
    )
  })

  it('appends (fork) to the title', async () => {
    const { forkProject } = await import('../lib/projects')
    await forkProject('proj-1')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Original (fork)' }),
    )
  })
})

// ─── addLogEntry ─────────────────────────────────────────────────────────────

describe('addLogEntry', () => {
  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { addLogEntry } = await import('../lib/projects')
    const result = await addLogEntry({ projectId: 'p1', content: 'test', tag: 'progress', isPublic: false })
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })

  it('inserts log entry and returns the created entry', async () => {
    const { addLogEntry } = await import('../lib/projects')
    const result = await addLogEntry({ projectId: 'p1', content: 'Hello', tag: 'progress', isPublic: false })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'log-1', content: 'test' })
  })
})
