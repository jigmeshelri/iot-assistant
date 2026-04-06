import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LocationPicker from '../components/islands/LocationPicker'

const mockFetchLocations = vi.fn()
const mockInsertLocation = vi.fn()

vi.mock('../lib/locations', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/locations')>()
  return {
    ...real,
    fetchLocations: (...args: unknown[]) => mockFetchLocations(...args),
    insertLocation: (...args: unknown[]) => mockInsertLocation(...args),
  }
})

const defaultLocations = [
  { id: 'l1', name: 'Taller', parent_id: null },
  { id: 'l2', name: 'Rack', parent_id: 'l1' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchLocations.mockResolvedValue(defaultLocations)
})

describe('LocationPicker', () => {
  it('shows "Sin ubicación" when no value', () => {
    render(<LocationPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByText('Sin ubicación')).toBeInTheDocument()
  })

  it('shows selected location name', () => {
    render(<LocationPicker value="l1" onChange={vi.fn()} locationName="Taller" />)
    expect(screen.getByText('Taller')).toBeInTheDocument()
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Taller')).toBeInTheDocument()
    })

    // Rack is a child of Taller; expand to reveal it
    await user.click(screen.getByText('▸'))

    await waitFor(() => {
      expect(screen.getByText('Rack')).toBeInTheDocument()
    })
  })

  it('selects location and calls onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Taller')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Taller'))
    expect(onChange).toHaveBeenCalledWith('l1')
  })

  it('clears selection with "Sin ubicación"', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value="l1" onChange={onChange} locationName="Taller" />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getAllByText('Sin ubicación').length).toBeGreaterThanOrEqual(1)
    })

    // The dropdown "Sin ubicación" option (not the button text)
    const options = screen.getAllByText('Sin ubicación')
    // Click the one inside the dropdown (last one)
    await user.click(options[options.length - 1])
    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe('LocationPicker — dropdown order (#14)', () => {
  it('shows "+ Nueva ubicación" before location items in DOM', async () => {
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))
    await waitFor(() => expect(screen.getByText('Taller')).toBeInTheDocument())

    // Get the full dropdown text and check ordering
    const dropdown = screen.getByText('Taller').closest('[class*="absolute"]')!
    const fullText = dropdown.textContent ?? ''

    const nuevaPos = fullText.indexOf('Nueva ubicación')
    const sinPos = fullText.indexOf('Sin ubicación')
    const tallerPos = fullText.indexOf('Taller')

    expect(nuevaPos).toBeGreaterThanOrEqual(0)
    expect(nuevaPos).toBeLessThan(sinPos)
    expect(sinPos).toBeLessThan(tallerPos)
  })

  it('shows "Sin ubicación" even when locations list is empty', async () => {
    mockFetchLocations.mockResolvedValue([])
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /nueva ubicación/i })).toBeInTheDocument())

    // Sin ubicación should appear in dropdown even with 0 locations
    const allSin = screen.getAllByText('Sin ubicación')
    // At least 2: button text + dropdown option
    expect(allSin.length).toBeGreaterThanOrEqual(2)
  })

  it('sorts locations alphabetically within each level', async () => {
    mockFetchLocations.mockResolvedValue([
      { id: 'l1', name: 'Zebra', parent_id: null },
      { id: 'l2', name: 'Alpha', parent_id: null },
      { id: 'l3', name: 'Middle', parent_id: null },
    ])
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    const dropdown = screen.getByText('Alpha').closest('.absolute')!
    const locationItems = Array.from(dropdown.querySelectorAll('[class*="flex items-center text-sm"]'))
    const names = locationItems.map(el => el.textContent?.trim())

    expect(names).toEqual(['Alpha', 'Middle', 'Zebra'])
  })
})

describe('LocationPicker — inline create (AC-7.1)', () => {
  it('AC-7.1.1: shows "+ Nueva ubicación" button when locations exist', async () => {
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))

    await waitFor(() => {
      expect(screen.getByText('Taller')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /nueva ubicación/i })).toBeInTheDocument()
  })

  it('AC-7.1.1: shows "+ Nueva ubicación" button when no locations exist', async () => {
    mockFetchLocations.mockResolvedValue([])
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva ubicación/i })).toBeInTheDocument()
    })
  })

  it('AC-7.1.2: clicking "+ Nueva ubicación" shows inline text input', async () => {
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))

    await waitFor(() => {
      expect(screen.getByText('Taller')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /nueva ubicación/i }))

    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument()
  })

  it('AC-7.1.3: confirming name creates location and calls onChange with new ID', async () => {
    const newId = 'l-new'
    mockInsertLocation.mockResolvedValue(newId)

    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))
    await waitFor(() => expect(screen.getByText('Taller')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /nueva ubicación/i }))

    const input = screen.getByPlaceholderText(/nombre/i)
    await user.type(input, 'Nuevo lugar')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockInsertLocation).toHaveBeenCalledWith('Nuevo lugar')
    })
    expect(onChange).toHaveBeenCalledWith(newId)
  })

  it('AC-7.1.5: pressing Escape hides the input without creating', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))
    await waitFor(() => expect(screen.getByText('Taller')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /nueva ubicación/i }))
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByPlaceholderText(/nombre/i)).not.toBeInTheDocument()
    expect(mockInsertLocation).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('AC-7.1.5: clicking cancel button hides input without creating', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationPicker value={null} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /sin ubicación/i }))
    await waitFor(() => expect(screen.getByText('Taller')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /nueva ubicación/i }))
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByPlaceholderText(/nombre/i)).not.toBeInTheDocument()
    expect(mockInsertLocation).not.toHaveBeenCalled()
  })
})
