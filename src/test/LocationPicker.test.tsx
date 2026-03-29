import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LocationPicker from '../components/islands/LocationPicker'

const mockFetchLocations = vi.fn()
const mockCreateLocation = vi.fn()

vi.mock('../lib/locations', () => ({
  fetchLocations: (...args: unknown[]) => mockFetchLocations(...args),
  createLocation: (...args: unknown[]) => mockCreateLocation(...args),
}))

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
    mockCreateLocation.mockResolvedValue(newId)

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
      expect(mockCreateLocation).toHaveBeenCalledWith('Nuevo lugar')
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
    expect(mockCreateLocation).not.toHaveBeenCalled()
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
    expect(mockCreateLocation).not.toHaveBeenCalled()
  })
})
