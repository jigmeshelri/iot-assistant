import { describe, it, expect } from 'vitest'
import type { BOMItem, BOMState } from '../lib/types'

describe('types', () => {
  it('BOMItem accepts the minimum required fields', () => {
    const item: BOMItem = { component_name: 'Resistor', quantity_required: 10 }
    expect(item.component_name).toBe('Resistor')
    expect(item.quantity_required).toBe(10)
  })

  it('BOMItem accepts all optional fields', () => {
    const item: BOMItem = {
      id: '1',
      component_id: 'c-1',
      component_name: 'LED',
      quantity_required: 5,
      state: 'available',
      available_quantity: 20,
      notes: 'red LED',
      component: { name: 'LED 5mm', sku: 'LED-001' },
    }
    expect(item.state).toBe('available')
    expect(item.notes).toBe('red LED')
  })

  it('BOMState only allows the four valid values', () => {
    const states: BOMState[] = ['available', 'partial', 'missing', 'incompatible']
    expect(states).toHaveLength(4)
  })
})
