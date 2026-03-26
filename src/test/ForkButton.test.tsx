import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ForkButton from '../components/islands/ForkButton'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockSingle = vi.fn().mockResolvedValue({
  data: { title: 'Original', description: 'Desc', project_type: 'diy', difficulty: 'beginner', tags: ['test'] },
  error: null,
})

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn(() => ({
      insert: mockInsert,
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
    })),
  }),
}))

describe('ForkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockSingle.mockResolvedValue({
      data: { title: 'Original', description: 'Desc', project_type: 'diy', difficulty: 'beginner', tags: ['test'] },
      error: null,
    })
  })

  it('renders fork button with count', () => {
    render(<ForkButton projectId="p1" forkCount={3} />)
    expect(screen.getByText(/Fork/)).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('click calls supabase insert and increments count', async () => {
    render(<ForkButton projectId="p1" forkCount={3} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
      expect(screen.getByText(/4/)).toBeInTheDocument()
      expect(screen.getByText(/Forkeado/)).toBeInTheDocument()
    })
  })

  it('button is disabled after fork', async () => {
    render(<ForkButton projectId="p1" forkCount={0} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })
})
