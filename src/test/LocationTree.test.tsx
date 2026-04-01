import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LocationTree from '../components/islands/LocationTree'

const mockInsertLocation = vi.fn().mockResolvedValue(undefined)

vi.mock('../lib/locations', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/locations')>()
  return {
    ...real,
    insertLocation: (...args: unknown[]) => mockInsertLocation(...args),
  }
})

Object.defineProperty(window, 'location', {
  value: { reload: vi.fn() },
  writable: true,
})

const locations = [
  { id: 'l1', name: 'Taller', parent_id: null, qr_code: 'qr1' },
  { id: 'l2', name: 'Rack', parent_id: 'l1', qr_code: 'qr2' },
  { id: 'l3', name: 'Maletín', parent_id: null, qr_code: 'qr3' },
]
const stockCounts = { l1: 5, l2: 12, l3: 3 }

describe('LocationTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders root locations', () => {
    render(<LocationTree locations={locations} />)
    expect(screen.getByText('Taller')).toBeInTheDocument()
    expect(screen.getByText('Maletín')).toBeInTheDocument()
  })

  it('renders children nested under parent', () => {
    render(<LocationTree locations={locations} />)
    expect(screen.getByText('Rack')).toBeInTheDocument()
  })

  it('shows stock counts when provided', () => {
    render(<LocationTree locations={locations} stockCounts={stockCounts} />)
    expect(screen.getByText('5 pzas')).toBeInTheDocument()
    expect(screen.getByText('12 pzas')).toBeInTheDocument()
  })

  it('new root location form', async () => {
    const user = userEvent.setup()
    render(<LocationTree locations={locations} />)

    await user.click(screen.getByText('+ Nueva ubicación raíz'))
    const input = screen.getByPlaceholderText('Nombre de ubicación')
    expect(input).toBeInTheDocument()

    await user.type(input, 'Bodega')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(mockInsertLocation).toHaveBeenCalledWith('Bodega')
  })

  describe('sub-location creation (AC-3.3.2)', () => {
    it('creates a sub-location under a parent when valid name is provided', async () => {
      const user = userEvent.setup()
      render(<LocationTree locations={locations} />)

      // Click the "+" button to add a sub-location under "Taller" (l1)
      const addButtons = screen.getAllByTitle('Añadir sub-ubicación')
      await user.click(addButtons[0])

      const input = screen.getByPlaceholderText('Nombre sub-ubicación')
      expect(input).toBeInTheDocument()

      await user.type(input, 'Estante A')
      await user.click(screen.getByRole('button', { name: 'Crear' }))

      expect(mockInsertLocation).toHaveBeenCalledWith('Estante A', 'l1')
    })

    it('does not submit when sub-location name is empty', async () => {
      const user = userEvent.setup()
      render(<LocationTree locations={locations} />)

      const addButtons = screen.getAllByTitle('Añadir sub-ubicación')
      await user.click(addButtons[0])

      // Submit with empty input
      await user.click(screen.getByRole('button', { name: 'Crear' }))

      expect(mockInsertLocation).not.toHaveBeenCalled()
    })
  })
})
