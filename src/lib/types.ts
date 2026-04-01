export type BOMState = 'available' | 'partial' | 'missing' | 'incompatible'

export interface BOMItem {
  id?: string
  component_id?: string
  component_name: string
  quantity_required: number
  state?: BOMState
  available_quantity?: number
  notes?: string | null
  component?: { name?: string; sku?: string } | null
}
