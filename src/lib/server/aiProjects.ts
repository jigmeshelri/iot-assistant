import type { BOMItem, PlanResponse, ProjectSuggestion } from '../api'

// Server-side logic for /api/ai/projects/* — ported 1:1 from api/main.py.
// Prompts and response contracts mirror the FastAPI service exactly.

export interface StockItemInput {
  component_id: string
  name: string
  category: string
  quantity: number
  platform_family?: string | null
  connectivity_caps?: Record<string, boolean>
  technical_specs?: Record<string, unknown>
}

export interface RefinementInput {
  preferred_controller?: string | null
  difficulty?: string | null
  constraints?: string[]
}

/** Narrows an untyped value to StockItemInput, or returns null. */
export function parseStockItem(item: unknown): StockItemInput | null {
  if (typeof item !== 'object' || item === null) return null
  const i = item as Record<string, unknown>
  if (typeof i['component_id'] !== 'string') return null
  if (typeof i['name'] !== 'string' || typeof i['category'] !== 'string') return null
  if (typeof i['quantity'] !== 'number') return null
  return item as StockItemInput
}

/** Narrows an untyped inventory array, or returns null if any item is invalid. */
export function parseInventory(value: unknown): StockItemInput[] | null {
  if (!Array.isArray(value)) return null
  const items = value.map(parseStockItem)
  return items.some(i => i === null) ? null : (items as StockItemInput[])
}

/** Port of `_inventory_to_text` in api/main.py. */
export function inventoryToText(inventory: StockItemInput[]): string {
  const lines = inventory.map(item => {
    const caps = Object.entries(item.connectivity_caps ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ')
    return (
      `- ${item.name} (qty: ${item.quantity}, category: ${item.category}` +
      (item.platform_family ? `, platform: ${item.platform_family}` : '') +
      (caps ? `, connectivity: ${caps}` : '') +
      ')'
    )
  })
  return lines.length ? lines.join('\n') : '(empty inventory)'
}

/** Maps an untyped value to the BOMItem contract (same defaults as the Pydantic model). */
export function toBOMItem(data: unknown): BOMItem {
  if (typeof data !== 'object' || data === null) {
    throw new Error('BOM item is not an object')
  }
  const d = data as Record<string, unknown>
  if (typeof d['component_name'] !== 'string') {
    throw new Error('Missing required field: component_name')
  }
  if (typeof d['quantity_required'] !== 'number') {
    throw new Error('Missing required field: quantity_required')
  }
  return {
    component_name: d['component_name'],
    quantity_required: d['quantity_required'],
    state: (d['state'] as BOMItem['state']) ?? 'available',
    available_quantity: (d['available_quantity'] as number) ?? 0,
    alternatives: (d['alternatives'] as string[]) ?? [],
    notes: (d['notes'] as string | null) ?? null,
  }
}

/** Narrows an untyped BOM array, or returns null if any item is invalid. */
export function parseBOMItems(value: unknown): BOMItem[] | null {
  if (!Array.isArray(value)) return null
  try {
    return value.map(toBOMItem)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// /api/ai/projects/discover
// ---------------------------------------------------------------------------

/** Builds the discover prompt (port of discover_projects in api/main.py). */
export function buildDiscoverPrompt(inventory: StockItemInput[]): string {
  return (
    "You are an IoT project advisor. Given this user's electronics inventory, suggest 5 interesting projects.\n\n" +
    `INVENTORY:\n${inventoryToText(inventory)}\n\n` +
    'For each project compute viability_pct (0-100) based on how many required components are available.\n' +
    'Respond ONLY with a valid JSON object (no markdown):\n' +
    '{"suggestions": [\n' +
    '  {\n' +
    '    "title": "Project title",\n' +
    '    "description": "2-3 sentence description",\n' +
    '    "viability_pct": 85,\n' +
    '    "difficulty": "beginner|intermediate|advanced",\n' +
    '    "project_type": "diy|prototype|professional",\n' +
    '    "tags": ["tag1","tag2"],\n' +
    '    "bom": [\n' +
    '      {"component_name":"ESP32","quantity_required":1,"state":"available","available_quantity":2,"alternatives":[],"notes":null}\n' +
    '    ]\n' +
    '  }\n' +
    ']}'
  )
}

/** Maps an untyped value to the ProjectSuggestion contract. Throws on missing required fields. */
export function toProjectSuggestion(data: unknown): ProjectSuggestion {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Suggestion is not an object')
  }
  const d = data as Record<string, unknown>
  for (const field of ['title', 'description', 'difficulty', 'project_type'] as const) {
    if (typeof d[field] !== 'string') throw new Error(`Missing required field: ${field}`)
  }
  if (typeof d['viability_pct'] !== 'number') {
    throw new Error('Missing required field: viability_pct')
  }
  if (!Array.isArray(d['bom'])) throw new Error('Missing required field: bom')
  return {
    title: d['title'] as string,
    description: d['description'] as string,
    viability_pct: d['viability_pct'],
    difficulty: d['difficulty'] as string,
    project_type: d['project_type'] as string,
    bom: (d['bom'] as unknown[]).map(toBOMItem),
    tags: (d['tags'] as string[]) ?? [],
  }
}

/**
 * Maps the parsed AI payload to the discover contract: validated suggestions
 * sorted by viability_pct desc, top 5 (port of discover_projects in api/main.py).
 */
export function toDiscoverResponse(data: Record<string, unknown>): {
  suggestions: ProjectSuggestion[]
} {
  if (!Array.isArray(data['suggestions'])) {
    throw new Error('Missing required field: suggestions')
  }
  const suggestions = (data['suggestions'] as unknown[]).map(toProjectSuggestion)
  suggestions.sort((a, b) => b.viability_pct - a.viability_pct)
  return { suggestions: suggestions.slice(0, 5) }
}

// ---------------------------------------------------------------------------
// /api/ai/projects/plan
// ---------------------------------------------------------------------------

export interface PlanRequestInput {
  description: string
  inventory: StockItemInput[]
  refinement?: RefinementInput | null
}

/** Narrows an untyped JSON body to PlanRequestInput, or returns null. */
export function parsePlanBody(body: unknown): PlanRequestInput | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (typeof b['description'] !== 'string') return null
  const inventory = parseInventory(b['inventory'])
  if (!inventory) return null
  if (b['refinement'] !== undefined && b['refinement'] !== null) {
    if (typeof b['refinement'] !== 'object') return null
  }
  return { ...(body as PlanRequestInput), inventory }
}

/** Builds the plan prompt (port of plan_project in api/main.py). */
export function buildPlanPrompt(req: PlanRequestInput): string {
  let refinementText = ''
  if (req.refinement) {
    const r = req.refinement
    const parts: string[] = []
    if (r.preferred_controller) parts.push(`preferred controller: ${r.preferred_controller}`)
    if (r.difficulty) parts.push(`target difficulty: ${r.difficulty}`)
    if (r.constraints && r.constraints.length) {
      parts.push(`constraints: ${r.constraints.join(', ')}`)
    }
    if (parts.length) {
      refinementText = '\nREFINEMENT:\n' + parts.map(p => `- ${p}`).join('\n')
    }
  }

  return (
    `You are an IoT project planner. The user wants to build:\n"${req.description}"\n\n` +
    `USER INVENTORY:\n${inventoryToText(req.inventory)}${refinementText}\n\n` +
    'Generate a complete BOM (bill of materials). For each item set state:\n' +
    '- available: user has enough quantity\n' +
    '- partial: user has some but not enough\n' +
    '- missing: user doesn\'t have it\n' +
    '- incompatible: user has it but wrong voltage/protocol\n' +
    'Respond ONLY with valid JSON (no markdown):\n' +
    '{"title":"Project title","description":"brief description","notes":"optional note or null","bom":[' +
    '{"component_name":"name","quantity_required":1,"state":"available","available_quantity":1,"alternatives":[],"notes":null}' +
    ']}'
  )
}

/**
 * Maps the parsed AI payload to the PlanResponse contract.
 * Throws on missing required fields, mirroring the Pydantic 422 behavior.
 */
export function toPlanResponse(data: Record<string, unknown>): PlanResponse {
  if (typeof data['title'] !== 'string') throw new Error('Missing required field: title')
  if (typeof data['description'] !== 'string') {
    throw new Error('Missing required field: description')
  }
  if (!Array.isArray(data['bom'])) throw new Error('Missing required field: bom')
  return {
    title: data['title'],
    description: data['description'],
    bom: (data['bom'] as unknown[]).map(toBOMItem),
    notes: (data['notes'] as string | null) ?? null,
  }
}
