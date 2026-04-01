import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import InventorySearch from '../components/islands/InventorySearch'
import LocationTree from '../components/islands/LocationTree'

vi.mock('../lib/locations', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/locations')>()
  return {
    ...real,
    insertLocation: vi.fn().mockResolvedValue(undefined),
  }
})

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
    it('shows create button when there are no locations', () => {
      render(<LocationTree locations={[]} />)
      expect(screen.getByText('+ Nueva ubicación')).toBeInTheDocument()
    })

    it('create button is always visible regardless of location count', () => {
      const locs = [{ id: 'l1', name: 'Taller', parent_id: null, qr_code: 'qr1' }]
      render(<LocationTree locations={locs} />)
      expect(screen.getByText('+ Nueva ubicación')).toBeInTheDocument()
    })
  })
})
