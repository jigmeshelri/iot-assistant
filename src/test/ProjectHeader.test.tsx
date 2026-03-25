import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProjectHeader from '../components/islands/ProjectHeader'

const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
const mockDelete = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn(() => ({
      update: mockUpdate,
      delete: mockDelete,
    })),
  }),
}))

Object.defineProperty(window, 'location', { writable: true, value: { href: '', reload: vi.fn() } })
window.confirm = vi.fn().mockReturnValue(true)

const defaultProps = {
  projectId: 'p1',
  title: 'Estación meteorológica',
  description: 'Proyecto de prueba',
  status: 'saved',
  projectType: 'diy',
  difficulty: 'intermediate',
  progress: 30,
  isPublic: false,
  tags: ['WiFi', 'sensor'],
}

describe('ProjectHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
  })

  it('renders title and status badge', () => {
    render(<ProjectHeader {...defaultProps} />)
    expect(screen.getByText('Estación meteorológica')).toBeInTheDocument()
    expect(screen.getByText('Guardado')).toBeInTheDocument()
  })

  it('shows correct action buttons for saved status', () => {
    render(<ProjectHeader {...defaultProps} />)
    expect(screen.getByText(/Iniciar/)).toBeInTheDocument()
    expect(screen.queryByText(/Pausar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Completar/)).not.toBeInTheDocument()
  })

  it('shows correct buttons for in_progress', () => {
    render(<ProjectHeader {...defaultProps} status="in_progress" />)
    expect(screen.getByText(/Pausar/)).toBeInTheDocument()
    expect(screen.getByText(/Completar/)).toBeInTheDocument()
    expect(screen.getByText(/Abandonar/)).toBeInTheDocument()
  })

  it('no action buttons for completed', () => {
    render(<ProjectHeader {...defaultProps} status="completed" />)
    expect(screen.queryByText(/Iniciar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pausar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Completar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Abandonar/)).not.toBeInTheDocument()
  })

  it('delete button calls confirm and supabase', async () => {
    render(<ProjectHeader {...defaultProps} />)
    const deleteBtn = screen.getByText('Eliminar proyecto')
    fireEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
    })
  })
})
