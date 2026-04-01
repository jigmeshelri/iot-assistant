import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProjectHeader from '../components/islands/ProjectHeader'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

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
    mockEq.mockResolvedValue({ error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
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

  // --- Title editing ---
  it('enters edit mode on pencil click, saves on blur', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    // Click pencil button to enter edit mode
    const pencilBtn = screen.getByTitle('Editar título')
    await user.click(pencilBtn)

    // Input should appear with title value
    const input = screen.getByDisplayValue('Estación meteorológica')
    expect(input).toBeInTheDocument()

    // Change the title and blur
    await user.clear(input)
    await user.type(input, 'Nuevo título')
    fireEvent.blur(input)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Nuevo título' })
    })
  })

  it('reverts title on Escape key', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByTitle('Editar título'))
    const input = screen.getByDisplayValue('Estación meteorológica')
    await user.clear(input)
    await user.type(input, 'Borrado')
    await user.keyboard('{Escape}')

    // Should revert and exit edit mode
    expect(screen.getByText('Estación meteorológica')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Borrado')).not.toBeInTheDocument()
  })

  it('saves title on Enter key', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByTitle('Editar título'))
    const input = screen.getByDisplayValue('Estación meteorológica')
    await user.clear(input)
    await user.type(input, 'Título con Enter')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Título con Enter' })
    })
  })

  it('does not save if title is unchanged', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByTitle('Editar título'))
    const input = screen.getByDisplayValue('Estación meteorológica')
    fireEvent.blur(input)

    // Should not call update since title is same
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('shows title error on save failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'fail' } })
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByTitle('Editar título'))
    const input = screen.getByDisplayValue('Estación meteorológica')
    await user.clear(input)
    await user.type(input, 'Fallo')
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByText('Error al guardar título')).toBeInTheDocument()
    })
  })

  // --- Description editing ---
  it('enters description edit mode on click', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByText('Proyecto de prueba'))

    const textarea = screen.getByDisplayValue('Proyecto de prueba')
    expect(textarea).toBeInTheDocument()
  })

  it('saves description on blur', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByText('Proyecto de prueba'))
    const textarea = screen.getByDisplayValue('Proyecto de prueba')
    await user.clear(textarea)
    await user.type(textarea, 'Nueva descripción')
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ description: 'Nueva descripción' })
    })
  })

  it('does not save description if unchanged', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByText('Proyecto de prueba'))
    const textarea = screen.getByDisplayValue('Proyecto de prueba')
    fireEvent.blur(textarea)

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // AC-3.6.3: Project details can be edited inline
  it('AC-3.6.3 — calls update with new name when user edits title and confirms', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByTitle('Editar título'))
    const input = screen.getByDisplayValue('Estación meteorológica')
    await user.clear(input)
    await user.type(input, 'Nuevo nombre del proyecto')
    fireEvent.blur(input)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Nuevo nombre del proyecto' })
    })
  })

  it('AC-3.6.3 — reverts description on Escape and dismisses edit mode', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByText('Proyecto de prueba'))
    const textarea = screen.getByDisplayValue('Proyecto de prueba')
    await user.clear(textarea)
    await user.type(textarea, 'Descripción modificada')
    await user.keyboard('{Escape}')

    // Edit mode should be dismissed and original value should remain
    expect(screen.getByText('Proyecto de prueba')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Descripción modificada')).not.toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('shows description error on save failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'fail' } })
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} />)

    await user.click(screen.getByText('Proyecto de prueba'))
    const textarea = screen.getByDisplayValue('Proyecto de prueba')
    await user.clear(textarea)
    await user.type(textarea, 'Nueva desc')
    fireEvent.blur(textarea)

    await waitFor(() => {
      expect(screen.getByText('Error al guardar descripción')).toBeInTheDocument()
    })
  })

  // --- Status transitions ---
  it('clicking Iniciar calls supabase update with in_progress', async () => {
    render(<ProjectHeader {...defaultProps} status="saved" />)
    fireEvent.click(screen.getByText(/Iniciar/))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'in_progress' })
    })
  })

  it('clicking Completar calls supabase update with completed', async () => {
    render(<ProjectHeader {...defaultProps} status="in_progress" />)
    fireEvent.click(screen.getByText(/Completar/))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' })
    })
  })

  it('clicking Pausar calls supabase update with paused', async () => {
    render(<ProjectHeader {...defaultProps} status="in_progress" />)
    fireEvent.click(screen.getByText(/Pausar/))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'paused' })
    })
  })

  it('clicking Abandonar calls supabase update with abandoned', async () => {
    render(<ProjectHeader {...defaultProps} status="in_progress" />)
    fireEvent.click(screen.getByText(/Abandonar/))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'abandoned' })
    })
  })

  it('shows status error on changeStatus failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'fail' } })
    render(<ProjectHeader {...defaultProps} status="saved" />)
    fireEvent.click(screen.getByText(/Iniciar/))

    await waitFor(() => {
      expect(screen.getByText('Error al cambiar estado')).toBeInTheDocument()
    })
  })

  it('shows paused status buttons (Reanudar, Abandonar)', () => {
    render(<ProjectHeader {...defaultProps} status="paused" />)
    expect(screen.getByText(/Reanudar/)).toBeInTheDocument()
    expect(screen.getByText(/Abandonar/)).toBeInTheDocument()
    expect(screen.queryByText(/Pausar/)).not.toBeInTheDocument()
  })

  it('no action buttons for abandoned status', () => {
    render(<ProjectHeader {...defaultProps} status="abandoned" />)
    expect(screen.queryByText(/Iniciar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Reanudar/)).not.toBeInTheDocument()
  })

  // --- Progress bar ---
  it('renders progress bar with correct percentage', () => {
    render(<ProjectHeader {...defaultProps} progress={60} />)
    expect(screen.getByText('Progreso')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('enters progress edit mode on bar click', async () => {
    const user = userEvent.setup()
    render(<ProjectHeader {...defaultProps} progress={30} />)

    // Click the progress bar container to enter edit mode
    const progressTexts = screen.getAllByText('30%')
    // The progress bar area — click on the bar
    const progressBar = progressTexts[0].closest('.space-y-1')!
    const barDiv = progressBar.querySelector('.h-2.bg-slate-100')!
    fireEvent.click(barDiv)

    // Should show range input
    const rangeInput = screen.getByRole('slider')
    expect(rangeInput).toBeInTheDocument()
  })

  it('saves progress on mouseUp from range input', async () => {
    render(<ProjectHeader {...defaultProps} progress={30} />)

    // Enter edit mode
    const progressBar = screen.getByText('Progreso').closest('.space-y-1')!
    const barDiv = progressBar.querySelector('.h-2.bg-slate-100')!
    fireEvent.click(barDiv)

    const rangeInput = screen.getByRole('slider')
    fireEvent.change(rangeInput, { target: { value: '75' } })
    fireEvent.mouseUp(rangeInput)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ progress: 75 })
    })
  })

  it('shows progress error on save failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'fail' } })
    render(<ProjectHeader {...defaultProps} progress={30} />)

    const progressBar = screen.getByText('Progreso').closest('.space-y-1')!
    const barDiv = progressBar.querySelector('.h-2.bg-slate-100')!
    fireEvent.click(barDiv)

    const rangeInput = screen.getByRole('slider')
    fireEvent.mouseUp(rangeInput)

    await waitFor(() => {
      expect(screen.getByText('Error al guardar progreso')).toBeInTheDocument()
    })
  })

  // --- Tags and badges ---
  it('renders tags', () => {
    render(<ProjectHeader {...defaultProps} />)
    expect(screen.getByText('WiFi')).toBeInTheDocument()
    expect(screen.getByText('sensor')).toBeInTheDocument()
  })

  it('renders type and difficulty badges', () => {
    render(<ProjectHeader {...defaultProps} projectType="diy" difficulty="beginner" />)
    expect(screen.getByText('DIY')).toBeInTheDocument()
    expect(screen.getByText('Principiante')).toBeInTheDocument()
  })

  it('does not render difficulty badge when null', () => {
    render(<ProjectHeader {...defaultProps} difficulty={null} />)
    expect(screen.queryByText('Principiante')).not.toBeInTheDocument()
    expect(screen.queryByText('Intermedio')).not.toBeInTheDocument()
  })

  it('renders empty description placeholder', () => {
    render(<ProjectHeader {...defaultProps} description="" />)
    expect(screen.getByText('Sin descripción — clic para agregar')).toBeInTheDocument()
  })

  // --- Delete ---
  it('does not delete when confirm is cancelled', async () => {
    ;(window.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)
    render(<ProjectHeader {...defaultProps} />)
    fireEvent.click(screen.getByText('Eliminar proyecto'))

    expect(window.confirm).toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('shows delete error on failure', async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: 'fail' } })
    render(<ProjectHeader {...defaultProps} />)
    fireEvent.click(screen.getByText('Eliminar proyecto'))

    await waitFor(() => {
      expect(screen.getByText('Error al eliminar proyecto')).toBeInTheDocument()
    })
  })

  it('redirects to /projects after successful delete', async () => {
    render(<ProjectHeader {...defaultProps} />)
    fireEvent.click(screen.getByText('Eliminar proyecto'))

    await waitFor(() => {
      expect(window.location.href).toBe('/projects')
    })
  })
})
