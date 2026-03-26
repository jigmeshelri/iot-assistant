import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import StockAdjuster from '../components/islands/StockAdjuster'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  }),
}))

describe('StockAdjuster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders current quantity', () => {
    render(<StockAdjuster stockId="s1" initialQuantity={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Cantidad en stock')).toBeInTheDocument()
  })

  it('+ button increments quantity', async () => {
    render(<StockAdjuster stockId="s1" initialQuantity={3} />)
    fireEvent.click(screen.getByText('+'))

    expect(screen.getByText('4')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ quantity: 4 })
      expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })
  })

  it('- button decrements quantity', async () => {
    render(<StockAdjuster stockId="s1" initialQuantity={3} />)
    fireEvent.click(screen.getByText('−'))

    expect(screen.getByText('2')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ quantity: 2 })
    })
  })

  it('- button is disabled at 0 (min 0)', () => {
    render(<StockAdjuster stockId="s1" initialQuantity={0} />)
    const minusBtn = screen.getByText('−')
    expect(minusBtn).toBeDisabled()
  })

  it('does not go below 0 when clicking -', () => {
    render(<StockAdjuster stockId="s1" initialQuantity={0} />)
    fireEvent.click(screen.getByText('−'))
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
