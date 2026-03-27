import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import LocationBreadcrumb from '../components/islands/LocationBreadcrumb'

describe('LocationBreadcrumb', () => {
  describe('AC-3.3.3 — Breadcrumb reflects hierarchy', () => {
    it('shows parent and current location when parent exists', () => {
      render(
        <LocationBreadcrumb
          location={{ id: 'l2', name: 'Drawer 1' }}
          parent={{ id: 'l1', name: 'Rack A' }}
        />
      )
      expect(screen.getByText('Rack A')).toBeInTheDocument()
      expect(screen.getByText('Drawer 1')).toBeInTheDocument()
    })

    it('parent is a link to the parent location', () => {
      render(
        <LocationBreadcrumb
          location={{ id: 'l2', name: 'Drawer 1' }}
          parent={{ id: 'l1', name: 'Rack A' }}
        />
      )
      const parentLink = screen.getByRole('link', { name: 'Rack A' })
      expect(parentLink).toHaveAttribute('href', '/locations/l1')
    })

    it('shows only the location name when there is no parent (root location)', () => {
      render(
        <LocationBreadcrumb
          location={{ id: 'l1', name: 'Rack A' }}
          parent={null}
        />
      )
      expect(screen.getByText('Rack A')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Rack A' })).not.toBeInTheDocument()
    })

    it('always links to /locations root', () => {
      render(
        <LocationBreadcrumb
          location={{ id: 'l1', name: 'Rack A' }}
          parent={null}
        />
      )
      expect(screen.getByRole('link', { name: 'Ubicaciones' })).toBeInTheDocument()
    })
  })

  describe('AC-3.3.3 — Sub-locations and components listed', () => {
    const subLocations = [
      { id: 's1', name: 'Shelf A' },
      { id: 's2', name: 'Shelf B' },
    ]
    const components = [
      { stockId: 'st1', name: 'ESP32-C6', quantity: 3 },
      { stockId: 'st2', name: 'Resistor 10k', quantity: 10 },
      { stockId: 'st3', name: 'Capacitor 100nF', quantity: 5 },
    ]

    it('renders all sub-location names', () => {
      render(
        <LocationBreadcrumb
          location={{ id: 'l1', name: 'Workshop' }}
          parent={null}
          subLocations={subLocations}
          components={[]}
        />
      )
      expect(screen.getByText('Shelf A')).toBeInTheDocument()
      expect(screen.getByText('Shelf B')).toBeInTheDocument()
    })

    it('renders all component names with quantities', () => {
      render(
        <LocationBreadcrumb
          location={{ id: 'l1', name: 'Workshop' }}
          parent={null}
          subLocations={[]}
          components={components}
        />
      )
      expect(screen.getByText('ESP32-C6')).toBeInTheDocument()
      expect(screen.getByText('Resistor 10k')).toBeInTheDocument()
      expect(screen.getByText('Capacitor 100nF')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders all 2 sub-locations and all 3 components together', () => {
      render(
        <LocationBreadcrumb
          location={{ id: 'l1', name: 'Workshop' }}
          parent={null}
          subLocations={subLocations}
          components={components}
        />
      )
      expect(screen.getByText('Shelf A')).toBeInTheDocument()
      expect(screen.getByText('Shelf B')).toBeInTheDocument()
      expect(screen.getByText('ESP32-C6')).toBeInTheDocument()
      expect(screen.getByText('Resistor 10k')).toBeInTheDocument()
      expect(screen.getByText('Capacitor 100nF')).toBeInTheDocument()
    })
  })
})
