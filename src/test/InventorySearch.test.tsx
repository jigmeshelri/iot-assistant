import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import InventorySearch from '../components/islands/InventorySearch'

const testItems = [
  {
    id: '1', quantity: 3,
    component: { name: 'ESP32-C6 XIAO', sku: 'MCU-001', category: 'Microcontrolador', image_url: null, platform_family: 'ESP32', connectivity_caps: { wifi: true, ble: true, zigbee: true, thread: true } },
    location: { name: 'Compartimento A', parent: { name: 'Maletín Azul' } },
  },
  {
    id: '2', quantity: 5,
    component: { name: 'DHT22', sku: 'SNS-001', category: 'Sensor', image_url: null, platform_family: null, connectivity_caps: {} },
    location: { name: 'Cajón 1', parent: null },
  },
  {
    id: '3', quantity: 1,
    component: { name: 'TP4056', sku: 'PWR-001', category: 'Alimentación', image_url: null, platform_family: null, connectivity_caps: {} },
    location: null,
  },
]

describe('InventorySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input and category chips', () => {
    render(<InventorySearch items={testItems} />)
    expect(screen.getByPlaceholderText('Buscar componentes...')).toBeInTheDocument()
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('filters by name (case-insensitive)', async () => {
    const user = userEvent.setup()
    render(<InventorySearch items={testItems} />)
    await user.type(screen.getByPlaceholderText('Buscar componentes...'), 'esp')
    await waitFor(() => {
      expect(screen.getByText('ESP32-C6 XIAO')).toBeInTheDocument()
      expect(screen.queryByText('DHT22')).not.toBeInTheDocument()
      expect(screen.queryByText('TP4056')).not.toBeInTheDocument()
    })
  })

  it('filters by SKU', async () => {
    const user = userEvent.setup()
    render(<InventorySearch items={testItems} />)
    await user.type(screen.getByPlaceholderText('Buscar componentes...'), 'SNS')
    await waitFor(() => {
      expect(screen.getByText('DHT22')).toBeInTheDocument()
      expect(screen.queryByText('ESP32-C6 XIAO')).not.toBeInTheDocument()
      expect(screen.queryByText('TP4056')).not.toBeInTheDocument()
    })
  })

  it('filters by category chip', async () => {
    const user = userEvent.setup()
    render(<InventorySearch items={testItems} />)

    await user.click(screen.getByText('Sensor'))
    await waitFor(() => {
      expect(screen.getByText('DHT22')).toBeInTheDocument()
      expect(screen.queryByText('ESP32-C6 XIAO')).not.toBeInTheDocument()
      expect(screen.queryByText('TP4056')).not.toBeInTheDocument()
    })

    await user.click(screen.getByText('Todos'))
    await waitFor(() => {
      expect(screen.getByText('ESP32-C6 XIAO')).toBeInTheDocument()
      expect(screen.getByText('DHT22')).toBeInTheDocument()
      expect(screen.getByText('TP4056')).toBeInTheDocument()
    })
  })

  it('filters by location name (AC-3.1.2)', async () => {
    const user = userEvent.setup()
    render(<InventorySearch items={testItems} />)
    await user.type(screen.getByPlaceholderText('Buscar componentes...'), 'Cajón')
    await waitFor(() => {
      expect(screen.getByText('DHT22')).toBeInTheDocument()
      expect(screen.queryByText('ESP32-C6 XIAO')).not.toBeInTheDocument()
      expect(screen.queryByText('TP4056')).not.toBeInTheDocument()
    })
  })

  it('filters by parent location name (AC-3.1.2)', async () => {
    const user = userEvent.setup()
    render(<InventorySearch items={testItems} />)
    await user.type(screen.getByPlaceholderText('Buscar componentes...'), 'Maletín')
    await waitFor(() => {
      expect(screen.getByText('ESP32-C6 XIAO')).toBeInTheDocument()
      expect(screen.queryByText('DHT22')).not.toBeInTheDocument()
      expect(screen.queryByText('TP4056')).not.toBeInTheDocument()
    })
  })

  it('shows empty state for no results', async () => {
    const user = userEvent.setup()
    render(<InventorySearch items={testItems} />)
    await user.type(screen.getByPlaceholderText('Buscar componentes...'), 'xyz')
    await waitFor(() => {
      expect(screen.getByText(/Sin resultados/)).toBeInTheDocument()
    })
  })

  it('shows connectivity badges on mobile', () => {
    render(<InventorySearch items={testItems} />)
    expect(screen.getByText('wifi')).toBeInTheDocument()
    expect(screen.getByText('ble')).toBeInTheDocument()
    expect(screen.getByText('zigbee')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('shows quantity with amber color for low stock', () => {
    render(<InventorySearch items={testItems} />)
    const tp4056Link = screen.getByText('TP4056').closest('a')!
    const qtyEl = tp4056Link.querySelector('.text-amber-500')
    expect(qtyEl).toBeInTheDocument()
    expect(qtyEl!.textContent).toBe('1')
  })
})
