import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import CommentThread from '../components/islands/CommentThread'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockSelectChain = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({ data: [] }),
  }),
})

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } })
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}
const mockRemoveChannel = vi.fn()

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn((table: string) => {
      if (table === 'project_comments') {
        return {
          select: mockSelectChain,
          insert: mockInsert,
        }
      }
      return {}
    }),
    auth: { getUser: mockGetUser },
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}))

const comments = [
  { id: 'c1', content: 'Primer comentario', created_at: '2025-06-01T10:00:00Z', user_id: 'u1' },
  { id: 'c2', content: 'Segundo comentario', created_at: '2025-06-02T12:00:00Z', user_id: 'u2' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
})

describe('CommentThread', () => {
  it('renders existing comments', async () => {
    mockSelectChain.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: comments }),
      }),
    })

    render(<CommentThread projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByText('Primer comentario')).toBeInTheDocument()
      expect(screen.getByText('Segundo comentario')).toBeInTheDocument()
    })
  })

  it('empty state when no comments', async () => {
    mockSelectChain.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [] }),
      }),
    })

    render(<CommentThread projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByText(/Sin comentarios aún/)).toBeInTheDocument()
    })
  })

  it('submit new comment', async () => {
    const user = userEvent.setup()
    mockSelectChain.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [] }),
      }),
    })

    render(<CommentThread projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Escribe un comentario...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Escribe un comentario...')
    await user.type(input, 'Nuevo comentario')
    await user.click(screen.getByText('Enviar'))

    expect(mockInsert).toHaveBeenCalledWith({
      project_id: 'p1',
      user_id: 'u1',
      content: 'Nuevo comentario',
    })
  })
})
