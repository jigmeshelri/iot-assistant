import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ForkButton from '../components/islands/ForkButton'

const mockForkProject = vi.fn().mockResolvedValue({ error: null })

vi.mock('../lib/projects', () => ({
  forkProject: (...args: unknown[]) => mockForkProject(...args),
}))

describe('ForkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForkProject.mockResolvedValue({ error: null })
  })

  it('renders fork button with count', () => {
    render(<ForkButton projectId="p1" forkCount={3} />)
    expect(screen.getByText(/Fork/)).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('click calls forkProject and increments count', async () => {
    render(<ForkButton projectId="p1" forkCount={3} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockForkProject).toHaveBeenCalledWith('p1')
      expect(screen.getByText(/4/)).toBeInTheDocument()
      expect(screen.getByText(/Forkeado/)).toBeInTheDocument()
    })
  })

  it('button is disabled after fork', async () => {
    render(<ForkButton projectId="p1" forkCount={0} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })
})
