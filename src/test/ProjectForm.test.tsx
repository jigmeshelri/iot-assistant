import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProjectForm from '../components/islands/ProjectForm'

const mockSingle = vi.fn().mockResolvedValue({
  data: { id: 'proj-1' },
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

Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '' },
})

describe('ProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
    mockSingle.mockResolvedValue({ data: { id: 'proj-1' }, error: null })
  })

  it('renders title input, description textarea, type and difficulty selectors', () => {
    render(<ProjectForm />)
    expect(screen.getByLabelText(/Nombre del proyecto/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Descripcion/)).toBeInTheDocument()
    expect(screen.getByText('Tipo de proyecto')).toBeInTheDocument()
    expect(screen.getByText('Dificultad')).toBeInTheDocument()
  })

  it('renders type buttons: DIY, Prototipo, Profesional', () => {
    render(<ProjectForm />)
    expect(screen.getByText('DIY')).toBeInTheDocument()
    expect(screen.getByText('Prototipo')).toBeInTheDocument()
    expect(screen.getByText('Profesional')).toBeInTheDocument()
  })

  it('clicking type button changes selection', () => {
    render(<ProjectForm />)
    const prototipoBtn = screen.getByText('Prototipo')
    fireEvent.click(prototipoBtn)
    expect(prototipoBtn.className).toContain('bg-brand-600')
    expect(screen.getByText('DIY').className).not.toContain('bg-brand-600')
  })

  it('renders difficulty buttons: Principiante, Intermedio, Avanzado', () => {
    render(<ProjectForm />)
    expect(screen.getByText('Principiante')).toBeInTheDocument()
    expect(screen.getByText('Intermedio')).toBeInTheDocument()
    expect(screen.getByText('Avanzado')).toBeInTheDocument()
  })

  it('clicking difficulty button changes selection', () => {
    render(<ProjectForm />)
    const avanzadoBtn = screen.getByText('Avanzado')
    fireEvent.click(avanzadoBtn)
    expect(avanzadoBtn.className).toContain('bg-brand-600')
    expect(screen.getByText('Principiante').className).not.toContain('bg-brand-600')
  })

  it('submit fills title and calls supabase insert', async () => {
    render(<ProjectForm />)
    await userEvent.type(screen.getByPlaceholderText('Mi proyecto IoT'), 'Estación WiFi')
    fireEvent.click(screen.getByText('Crear proyecto'))

    await waitFor(() => {
      expect(window.location.href).toBe('/projects/proj-1')
    })
  })

  it('shows error message on insert failure', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })
    render(<ProjectForm />)
    await userEvent.type(screen.getByPlaceholderText('Mi proyecto IoT'), 'Test')
    fireEvent.click(screen.getByText('Crear proyecto'))

    await waitFor(() => {
      expect(screen.getByText('Insert failed')).toBeInTheDocument()
    })
  })
})
