import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PublishProject from '../components/islands/PublishProject'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  }),
}))

Object.defineProperty(window, 'location', { writable: true, value: { href: '', reload: vi.fn() } })
window.confirm = vi.fn().mockReturnValue(true)

const logEntries = [
  { id: 'log1', content: 'Primera entrada', tag: 'progress', is_public: true, created_at: '2025-06-01T10:00:00Z' },
  { id: 'log2', content: 'Segunda entrada', tag: 'note', is_public: false, created_at: '2025-06-02T12:00:00Z' },
]

const defaultProps = {
  projectId: 'p1',
  isPublic: false,
  status: 'completed',
  title: 'Mi proyecto',
  description: 'Descripción del proyecto',
  difficulty: 'beginner',
  tags: ['wifi', 'sensor'],
  logEntries,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockEq.mockResolvedValue({ error: null })
  mockUpdate.mockImplementation(() => ({ eq: mockEq }))
  window.location.href = ''
  ;(window.location.reload as ReturnType<typeof vi.fn>).mockReset()
})

describe('PublishProject', () => {
  it('returns null when status is not completed', () => {
    const { container } = render(<PublishProject {...defaultProps} status="in_progress" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders publish button for unpublished completed project', () => {
    render(<PublishProject {...defaultProps} />)
    expect(screen.getByText('Publicar en comunidad')).toBeInTheDocument()
  })

  it('opens form and shows log entry checkboxes', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))

    expect(screen.getByText('Publicar proyecto')).toBeInTheDocument()
    expect(screen.getByText(/Primera entrada/)).toBeInTheDocument()
    expect(screen.getByText(/Segunda entrada/)).toBeInTheDocument()
    expect(screen.getByText('Publicar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('publish action calls supabase update', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        is_public: true,
        title: 'Mi proyecto',
        description: 'Descripción del proyecto',
        difficulty: 'beginner',
        tags: ['wifi', 'sensor'],
      })
    })
  })

  it('shows published state with unpublish button', () => {
    render(<PublishProject {...defaultProps} isPublic={true} />)
    expect(screen.getByText(/Publicado en comunidad/)).toBeInTheDocument()
    expect(screen.getByText('Despublicar')).toBeInTheDocument()
  })

  it('unpublish action calls supabase update', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} isPublic={true} />)

    await user.click(screen.getByText('Despublicar'))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_public: false })
    })
  })

  it('loading state while publishing', async () => {
    const user = userEvent.setup()
    let resolveUpdate: (v: unknown) => void
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue(
        new Promise(r => { resolveUpdate = r })
      ),
    })

    render(<PublishProject {...defaultProps} />)
    await user.click(screen.getByText('Publicar en comunidad'))
    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(screen.getByText('Publicando...')).toBeInTheDocument()
    })

    resolveUpdate!({ error: null })
  })

  // --- New tests for uncovered lines ---

  it('shows community link when published', () => {
    render(<PublishProject {...defaultProps} isPublic={true} />)
    const link = screen.getByText('Ver en comunidad →')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/community/p1')
  })

  it('does not unpublish when confirm is cancelled', async () => {
    ;(window.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} isPublic={true} />)

    await user.click(screen.getByText('Despublicar'))

    expect(window.confirm).toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('shows unpublish error on failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'fail' } })
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} isPublic={true} />)

    await user.click(screen.getByText('Despublicar'))

    await waitFor(() => {
      expect(screen.getByText('Error al despublicar')).toBeInTheDocument()
    })
  })

  it('shows publish error on failure', async () => {
    mockEq.mockResolvedValue({ error: { message: 'fail' } })
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(screen.getByText('Error al publicar el proyecto')).toBeInTheDocument()
    })
  })

  it('closes form on Cancel click', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    expect(screen.getByText('Publicar proyecto')).toBeInTheDocument()

    await user.click(screen.getByText('Cancelar'))
    expect(screen.queryByText('Publicar proyecto')).not.toBeInTheDocument()
    expect(screen.getByText('Publicar en comunidad')).toBeInTheDocument()
  })

  it('can toggle log entry selection', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))

    const checkboxes = screen.getAllByRole('checkbox')
    // log1 is public (checked), log2 is not (unchecked)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()

    // Toggle log2 on
    await user.click(checkboxes[1])
    expect(checkboxes[1]).toBeChecked()

    // Toggle log1 off
    await user.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()
  })

  it('can edit title in publish form', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    const titleInput = screen.getByDisplayValue('Mi proyecto')
    await user.clear(titleInput)
    await user.type(titleInput, 'Nuevo título publicado')

    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Nuevo título publicado' })
      )
    })
  })

  it('can edit description in publish form', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    const descInput = screen.getByDisplayValue('Descripción del proyecto')
    await user.clear(descInput)
    await user.type(descInput, 'Nueva desc')

    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Nueva desc' })
      )
    })
  })

  it('can select difficulty in publish form', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))

    // Click "Avanzado" difficulty button
    await user.click(screen.getByText('Avanzado'))

    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ difficulty: 'advanced' })
      )
    })
  })

  it('can remove a tag', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))

    // Tags are shown; remove 'wifi'
    const removeButtons = screen.getAllByText('×')
    await user.click(removeButtons[0]) // remove first tag

    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['sensor'] })
      )
    })
  })

  it('can add a tag via Enter key', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))

    const tagInput = screen.getByPlaceholderText('+ añadir')
    await user.type(tagInput, 'bluetooth{Enter}')

    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['wifi', 'sensor', 'bluetooth'] })
      )
    })
  })

  it('can add a tag on blur', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))

    const tagInput = screen.getByPlaceholderText('+ añadir')
    await user.type(tagInput, 'lora')
    // Blur to trigger addTag
    fireEvent.blur(tagInput)

    expect(screen.getByText('lora')).toBeInTheDocument()
  })

  it('does not add duplicate tags', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))

    const tagInput = screen.getByPlaceholderText('+ añadir')
    await user.type(tagInput, 'wifi{Enter}')

    // Still only 2 tags
    await user.click(screen.getByText('Publicar'))
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['wifi', 'sensor'] })
      )
    })
  })

  it('shows privacy note in the form', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    expect(screen.getByText(/inventario personal/)).toBeInTheDocument()
  })

  it('shows difficulty options in the form', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    expect(screen.getByText('Principiante')).toBeInTheDocument()
    expect(screen.getByText('Intermedio')).toBeInTheDocument()
    expect(screen.getByText('Avanzado')).toBeInTheDocument()
  })

  it('renders with no log entries', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} logEntries={[]} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    // No checkboxes should appear
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    // Form should still render
    expect(screen.getByText('Publicar')).toBeInTheDocument()
  })

  it('publish button is disabled when title is empty', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    const titleInput = screen.getByDisplayValue('Mi proyecto')
    await user.clear(titleInput)

    const publishBtn = screen.getByText('Publicar')
    expect(publishBtn).toBeDisabled()
  })

  it('handles null description prop', () => {
    render(<PublishProject {...defaultProps} description={null} />)
    expect(screen.getByText('Publicar en comunidad')).toBeInTheDocument()
  })

  it('reloads page after successful publish', async () => {
    const user = userEvent.setup()
    render(<PublishProject {...defaultProps} />)

    await user.click(screen.getByText('Publicar en comunidad'))
    await user.click(screen.getByText('Publicar'))

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled()
    })
  })
})
