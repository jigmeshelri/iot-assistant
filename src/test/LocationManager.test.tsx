import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LocationManager from '../components/islands/LocationManager'

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
  locationId: 'loc1',
  name: 'Cajón principal',
  stockCount: 3,
}

beforeEach(() => {
  vi.clearAllMocks()
  window.location.href = ''
})

describe('LocationManager', () => {
  it('renders name and edit/delete buttons', () => {
    render(<LocationManager {...defaultProps} />)
    expect(screen.getByText('Cajón principal')).toBeInTheDocument()
    expect(screen.getByTitle('Editar nombre')).toBeInTheDocument()
    expect(screen.getByText('Eliminar ubicación')).toBeInTheDocument()
  })

  it('entering edit mode shows input with current name', async () => {
    const user = userEvent.setup()
    render(<LocationManager {...defaultProps} />)

    await user.click(screen.getByTitle('Editar nombre'))
    const input = screen.getByDisplayValue('Cajón principal')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('submit updates location via supabase', async () => {
    const user = userEvent.setup()
    render(<LocationManager {...defaultProps} />)

    await user.click(screen.getByTitle('Editar nombre'))
    const input = screen.getByDisplayValue('Cajón principal')
    await user.clear(input)
    await user.type(input, 'Estante A{Enter}')

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Estante A' })
    })
  })

  it('delete calls confirm and redirects', async () => {
    const user = userEvent.setup()
    render(<LocationManager {...defaultProps} />)

    await user.click(screen.getByText('Eliminar ubicación'))

    expect(window.confirm).toHaveBeenCalledWith(
      'Esta ubicación tiene 3 componentes que quedarán sin ubicación. ¿Continuar?'
    )
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
    })
  })
})
