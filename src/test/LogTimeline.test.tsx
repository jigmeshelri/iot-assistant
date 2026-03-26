import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LogTimeline from '../components/islands/LogTimeline'

const mockSingle = vi.fn().mockResolvedValue({
  data: { id: 'log-new', content: 'Nueva entrada', tag: 'progress', is_public: false, created_at: '2026-03-25T12:00:00Z' },
  error: null,
})

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
    })),
  }),
}))

const sampleEntries = [
  { id: 'e1', content: 'Conecté el sensor DHT22', tag: 'progress' as const, is_public: false, created_at: '2026-03-20T10:00:00Z' },
  { id: 'e2', content: 'El voltaje no es estable', tag: 'problem' as const, is_public: true, created_at: '2026-03-21T14:00:00Z' },
]

describe('LogTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders log entries with content', () => {
    render(<LogTimeline projectId="p1" initialEntries={sampleEntries} />)
    expect(screen.getByText('Conecté el sensor DHT22')).toBeInTheDocument()
    expect(screen.getByText('El voltaje no es estable')).toBeInTheDocument()
  })

  it('renders timestamps', () => {
    render(<LogTimeline projectId="p1" initialEntries={sampleEntries} />)
    expect(screen.getByText('20 mar')).toBeInTheDocument()
    expect(screen.getByText('21 mar')).toBeInTheDocument()
  })

  it('shows tag badges', () => {
    render(<LogTimeline projectId="p1" initialEntries={sampleEntries} />)
    expect(screen.getByText(/Progreso/)).toBeInTheDocument()
    expect(screen.getByText(/Problema/)).toBeInTheDocument()
  })

  it('shows empty state when no entries (only add button)', () => {
    render(<LogTimeline projectId="p1" initialEntries={[]} />)
    expect(screen.getByText(/Añadir entrada/)).toBeInTheDocument()
    expect(screen.queryByText(/Progreso/)).not.toBeInTheDocument()
  })

  it('shows add entry form when button is clicked', () => {
    render(<LogTimeline projectId="p1" initialEntries={[]} />)
    fireEvent.click(screen.getByText(/Añadir entrada/))
    expect(screen.getByPlaceholderText(/Qué hiciste/)).toBeInTheDocument()
    expect(screen.getByText('Guardar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('cancel hides the form', () => {
    render(<LogTimeline projectId="p1" initialEntries={[]} />)
    fireEvent.click(screen.getByText(/Añadir entrada/))
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.queryByText('Guardar')).not.toBeInTheDocument()
  })

  it('submitting form adds new entry', async () => {
    render(<LogTimeline projectId="p1" initialEntries={[]} />)
    fireEvent.click(screen.getByText(/Añadir entrada/))
    fireEvent.change(screen.getByPlaceholderText(/Qué hiciste/), { target: { value: 'Nueva entrada' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => {
      expect(screen.getByText('Nueva entrada')).toBeInTheDocument()
    })
  })
})
