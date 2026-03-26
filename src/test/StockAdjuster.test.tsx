import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import StockAdjuster from '../components/islands/StockAdjuster'

const mockUpdateStockQuantity = vi.fn().mockResolvedValue(null)

vi.mock('../lib/supabase', () => ({
  updateStockQuantity: (...args: unknown[]) => mockUpdateStockQuantity(...args),
}))

describe('StockAdjuster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateStockQuantity.mockResolvedValue(null)
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
      expect(mockUpdateStockQuantity).toHaveBeenCalledWith('s1', 4)
    })
  })

  it('- button decrements quantity', async () => {
    render(<StockAdjuster stockId="s1" initialQuantity={3} />)
    fireEvent.click(screen.getByText('−'))

    expect(screen.getByText('2')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockUpdateStockQuantity).toHaveBeenCalledWith('s1', 2)
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
    expect(mockUpdateStockQuantity).not.toHaveBeenCalled()
  })

  it('shows error feedback when supabase update fails', async () => {
    mockUpdateStockQuantity.mockResolvedValueOnce('Network error')
    render(<StockAdjuster stockId="s1" initialQuantity={3} />)
    fireEvent.click(screen.getByText('+'))

    await waitFor(() => {
      const hasError = screen.queryByText(/error/i)
      const reverted = screen.queryByText('3')
      expect(hasError || reverted).toBeTruthy()
    })
  })
})
