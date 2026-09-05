import { describe, expect, it } from 'vitest'
import {
  buildDiscoverPrompt,
  buildPlanPrompt,
  inventoryToText,
  parseInventory,
  parsePlanBody,
  parseStockItem,
  toBOMItem,
  toDiscoverResponse,
  toPlanResponse,
  type StockItemInput,
} from '../lib/server/aiProjects'

const esp32: StockItemInput = {
  component_id: 'c1',
  name: 'ESP32-WROOM-32',
  category: 'Microcontrolador',
  quantity: 2,
  platform_family: 'ESP32',
  connectivity_caps: { wifi: true, ble: true, lora: false },
}

const led: StockItemInput = {
  component_id: 'c2',
  name: 'LED rojo',
  category: 'Pasivo',
  quantity: 10,
}

describe('parseStockItem', () => {
  it('accepts a valid item', () => {
    expect(parseStockItem(esp32)).toEqual(esp32)
  })

  it('rejects invalid items', () => {
    expect(parseStockItem(null)).toBeNull()
    expect(parseStockItem({ ...esp32, name: 42 })).toBeNull()
    expect(parseStockItem({ ...esp32, quantity: 'two' })).toBeNull()
    expect(parseStockItem({ name: 'x', category: 'y', quantity: 1 })).toBeNull()
  })
})

describe('parseInventory', () => {
  it('accepts an array of valid items', () => {
    expect(parseInventory([esp32, led])).toHaveLength(2)
  })

  it('accepts an empty inventory', () => {
    expect(parseInventory([])).toEqual([])
  })

  it('rejects non-arrays and arrays with invalid items', () => {
    expect(parseInventory('nope')).toBeNull()
    expect(parseInventory([esp32, { bad: true }])).toBeNull()
  })
})

describe('inventoryToText', () => {
  it('formats items with platform and truthy connectivity caps', () => {
    expect(inventoryToText([esp32])).toBe(
      '- ESP32-WROOM-32 (qty: 2, category: Microcontrolador, platform: ESP32, connectivity: wifi, ble)',
    )
  })

  it('omits optional segments when absent', () => {
    expect(inventoryToText([led])).toBe('- LED rojo (qty: 10, category: Pasivo)')
  })

  it('renders the empty-inventory placeholder', () => {
    expect(inventoryToText([])).toBe('(empty inventory)')
  })
})

describe('toBOMItem', () => {
  it('maps a full item', () => {
    expect(
      toBOMItem({
        component_name: 'ESP32',
        quantity_required: 1,
        state: 'partial',
        available_quantity: 1,
        alternatives: ['RP2040'],
        notes: 'short by one',
      }),
    ).toEqual({
      component_name: 'ESP32',
      quantity_required: 1,
      state: 'partial',
      available_quantity: 1,
      alternatives: ['RP2040'],
      notes: 'short by one',
    })
  })

  it('applies the Pydantic defaults', () => {
    expect(toBOMItem({ component_name: 'ESP32', quantity_required: 2 })).toEqual({
      component_name: 'ESP32',
      quantity_required: 2,
      state: 'available',
      available_quantity: 0,
      alternatives: [],
      notes: null,
    })
  })

  it('throws on missing required fields', () => {
    expect(() => toBOMItem({ quantity_required: 1 })).toThrow()
    expect(() => toBOMItem({ component_name: 'x' })).toThrow()
    expect(() => toBOMItem(null)).toThrow()
  })
})

describe('buildDiscoverPrompt', () => {
  it('embeds the inventory and asks for the suggestions contract', () => {
    const prompt = buildDiscoverPrompt([esp32])
    expect(prompt).toContain('suggest 5 interesting projects')
    expect(prompt).toContain('INVENTORY:\n- ESP32-WROOM-32')
    expect(prompt).toContain('"viability_pct": 85')
    expect(prompt).toContain('Respond ONLY with a valid JSON object (no markdown)')
  })
})

describe('toDiscoverResponse', () => {
  const suggestion = (title: string, viability_pct: number) => ({
    title,
    description: 'desc',
    viability_pct,
    difficulty: 'beginner',
    project_type: 'diy',
    bom: [],
  })

  it('sorts by viability_pct desc and keeps the top 5', () => {
    const res = toDiscoverResponse({
      suggestions: [10, 90, 50, 99, 30, 70].map(v => suggestion(`p${v}`, v)),
    })
    expect(res.suggestions.map(s => s.viability_pct)).toEqual([99, 90, 70, 50, 30])
  })

  it('defaults tags to an empty array', () => {
    const res = toDiscoverResponse({ suggestions: [suggestion('a', 1)] })
    expect(res.suggestions[0].tags).toEqual([])
  })

  it('throws when suggestions is missing or an item is invalid', () => {
    expect(() => toDiscoverResponse({})).toThrow()
    expect(() => toDiscoverResponse({ suggestions: [{ title: 'x' }] })).toThrow()
  })
})

describe('parsePlanBody', () => {
  const valid = { description: 'una alarma', inventory: [esp32] }

  it('accepts a valid body with and without refinement', () => {
    expect(parsePlanBody(valid)).toMatchObject({ description: 'una alarma' })
    expect(
      parsePlanBody({ ...valid, refinement: { difficulty: 'beginner' } }),
    ).toMatchObject({ refinement: { difficulty: 'beginner' } })
  })

  it('rejects invalid bodies', () => {
    expect(parsePlanBody(null)).toBeNull()
    expect(parsePlanBody({ inventory: [] })).toBeNull()
    expect(parsePlanBody({ description: 'x', inventory: 'nope' })).toBeNull()
    expect(parsePlanBody({ ...valid, refinement: 'nope' })).toBeNull()
  })
})

describe('buildPlanPrompt', () => {
  it('embeds description and inventory without refinement block', () => {
    const prompt = buildPlanPrompt({ description: 'una alarma', inventory: [led] })
    expect(prompt).toContain('The user wants to build:\n"una alarma"')
    expect(prompt).toContain('USER INVENTORY:\n- LED rojo')
    expect(prompt).not.toContain('REFINEMENT')
  })

  it('appends the refinement block when options are present', () => {
    const prompt = buildPlanPrompt({
      description: 'una alarma',
      inventory: [],
      refinement: {
        preferred_controller: 'ESP32',
        difficulty: 'advanced',
        constraints: ['battery powered'],
      },
    })
    expect(prompt).toContain(
      '\nREFINEMENT:\n- preferred controller: ESP32\n- target difficulty: advanced\n- constraints: battery powered',
    )
  })

  it('omits the refinement block when refinement has no usable options', () => {
    const prompt = buildPlanPrompt({
      description: 'x',
      inventory: [],
      refinement: { constraints: [] },
    })
    expect(prompt).not.toContain('REFINEMENT')
  })
})

describe('toPlanResponse', () => {
  it('maps a full payload', () => {
    const res = toPlanResponse({
      title: 'Alarma',
      description: 'desc',
      notes: 'usa deep sleep',
      bom: [{ component_name: 'ESP32', quantity_required: 1 }],
    })
    expect(res).toEqual({
      title: 'Alarma',
      description: 'desc',
      notes: 'usa deep sleep',
      bom: [
        {
          component_name: 'ESP32',
          quantity_required: 1,
          state: 'available',
          available_quantity: 0,
          alternatives: [],
          notes: null,
        },
      ],
    })
  })

  it('defaults notes to null', () => {
    expect(toPlanResponse({ title: 't', description: 'd', bom: [] }).notes).toBeNull()
  })

  it('throws on missing required fields', () => {
    expect(() => toPlanResponse({ description: 'd', bom: [] })).toThrow()
    expect(() => toPlanResponse({ title: 't', bom: [] })).toThrow()
    expect(() => toPlanResponse({ title: 't', description: 'd' })).toThrow()
  })
})
