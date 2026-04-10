import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LocationTree from '../components/islands/LocationTree'

const mockInsertLocation = vi.fn()

vi.mock('../lib/locations', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/locations')>()
  return {
    ...real,
    insertLocation: (...args: unknown[]) => mockInsertLocation(...args),
  }
})

const reloadSpy = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: reloadSpy },
  writable: true,
})

const locations = [
  { id: 'l1', name: 'Taller', parent_id: null },
  { id: 'l2', name: 'Rack', parent_id: 'l1' },
  { id: 'l3', name: 'Maletín', parent_id: null },
]
const stockCounts = { l1: 5, l2: 12, l3: 3 }

describe('LocationTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertLocation.mockResolvedValue({ id: 'new-id', name: 'New', parent_id: null })
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

  it('does not nest action buttons inside the navigation anchor (valid HTML)', () => {
    const { container } = render(<LocationTree locations={locations} />)
    const anchors = container.querySelectorAll('a[href^="/locations/"]')
    expect(anchors.length).toBeGreaterThan(0)
    for (const a of anchors) {
      expect(a.querySelector('button')).toBeNull()
    }
  })

  it('shows stock counts when provided', () => {
    render(<LocationTree locations={locations} stockCounts={stockCounts} />)
    expect(screen.getByText('5 pzas')).toBeInTheDocument()
    expect(screen.getByText('12 pzas')).toBeInTheDocument()
  })

  it('new root location form', async () => {
    const user = userEvent.setup()
    mockInsertLocation.mockResolvedValueOnce({ id: 'lnew', name: 'Bodega', parent_id: null })
    render(<LocationTree locations={locations} />)

    await user.click(screen.getByText('+ Nueva ubicación'))
    const input = screen.getByPlaceholderText('Nombre de ubicación')
    expect(input).toBeInTheDocument()

    await user.type(input, 'Bodega')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(mockInsertLocation).toHaveBeenCalledWith('Bodega', undefined)
  })

  it('appends newly created root location in place without reload', async () => {
    const user = userEvent.setup()
    mockInsertLocation.mockResolvedValueOnce({ id: 'lnew', name: 'Bodega', parent_id: null })
    render(<LocationTree locations={locations} />)

    await user.click(screen.getByText('+ Nueva ubicación'))
    await user.type(screen.getByPlaceholderText('Nombre de ubicación'), 'Bodega')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Bodega')).toBeInTheDocument()
    expect(reloadSpy).not.toHaveBeenCalled()
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

    it('appends newly created sub-location in place without reload', async () => {
      const user = userEvent.setup()
      mockInsertLocation.mockResolvedValueOnce({ id: 'lchild', name: 'Estante A', parent_id: 'l1' })
      render(<LocationTree locations={locations} />)

      const addButtons = screen.getAllByTitle('Añadir sub-ubicación')
      await user.click(addButtons[0])
      await user.type(screen.getByPlaceholderText('Nombre sub-ubicación'), 'Estante A')
      await user.click(screen.getByRole('button', { name: 'Crear' }))

      expect(await screen.findByText('Estante A')).toBeInTheDocument()
      expect(reloadSpy).not.toHaveBeenCalled()
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
