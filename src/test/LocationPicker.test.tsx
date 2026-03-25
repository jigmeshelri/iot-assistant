import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import LocationPicker from '../components/islands/LocationPicker'

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'l1', name: 'Taller', parent_id: null },
            { id: 'l2', name: 'Rack', parent_id: 'l1' },
          ],
          error: null,
        }),
      })),
    })),
  }),
}))

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
