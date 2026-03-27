import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import InventorySearch from '../components/islands/InventorySearch'
import LocationTree from '../components/islands/LocationTree'

vi.mock('../lib/locations', () => ({
  insertLocation: vi.fn().mockResolvedValue(undefined),
}))

describe('AC-4.5: First-login empty state / onboarding', () => {
  describe('InventorySearch — no inventory data', () => {
    it('shows empty state message when there are no items', () => {
      render(<InventorySearch items={[]} />)
      expect(screen.getByText(/no tenés componentes/i)).toBeInTheDocument()
    })

    it('shows CTA link to create first component', () => {
      render(<InventorySearch items={[]} />)
      const cta = screen.getByRole('link', { name: /añadir primer componente/i })
      expect(cta).toBeInTheDocument()
      expect(cta).toHaveAttribute('href', '/inventory/new')
    })
  })

  describe('LocationTree — no locations', () => {
    it('shows empty state message when there are no locations', () => {
      render(<LocationTree locations={[]} />)
      expect(screen.getByText(/no tenés ubicaciones/i)).toBeInTheDocument()
    })

    it('shows CTA button to create first location', () => {
      render(<LocationTree locations={[]} />)
      expect(screen.getByRole('button', { name: /crear primera ubicación/i })).toBeInTheDocument()
    })
  })
})
