import { createSupabaseBrowserClient } from './supabase'

export interface StockInventoryItem {
  component_id: string | null
  name: string | null
  category: string | null
  quantity: number
  platform_family: string | null
  connectivity_caps: Record<string, unknown>
  specs: Record<string, unknown>
}

export async function getUserStock(): Promise<StockInventoryItem[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: stock, error } = await supabase
    .from('stock')
    .select('quantity, component:components(id,name,category,platform_family,connectivity_caps,technical_specs)')
  if (error) throw new Error(error.message)
  return (stock ?? []).map(s => {
    const comp = s.component as Record<string, unknown> | null ?? {}
    return {
      component_id:      (comp.id as string | null) ?? null,
      name:              (comp.name as string | null) ?? null,
      category:          (comp.category as string | null) ?? null,
      quantity:          s.quantity,
      platform_family:   (comp.platform_family as string | null) ?? null,
      connectivity_caps: (comp.connectivity_caps as Record<string, unknown>) ?? {},
      specs:             (comp.technical_specs as Record<string, unknown>) ?? {},
    }
  })
}
