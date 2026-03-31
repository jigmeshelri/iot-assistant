import { createSupabaseBrowserClient } from './supabase'

export interface UpdateComponentInput {
  name: string
  category: string
  platform_family: string | null
  connectivity_caps: Record<string, boolean>
  technical_specs: Record<string, string>
  datasheet_url: string | null
}

export interface UpdateStockInput {
  location_id: string | null
  notes: string | null
}

export async function updateInventoryItem(
  componentId: string,
  stockId: string,
  component: UpdateComponentInput,
  stock: UpdateStockInput,
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error: compErr } = await supabase
    .from('components')
    .update({
      name: component.name,
      category: component.category,
      platform_family: component.platform_family,
      connectivity_caps: component.connectivity_caps,
      technical_specs: component.technical_specs,
      datasheet_url: component.datasheet_url,
    })
    .eq('id', componentId)
  if (compErr) return { error: compErr.message }

  const { error: stockErr } = await supabase
    .from('stock')
    .update({
      location_id: stock.location_id,
      notes: stock.notes,
    })
    .eq('id', stockId)
  if (stockErr) return { error: stockErr.message }

  return { error: null }
}

export async function deleteStockItem(
  stockId: string,
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('stock').delete().eq('id', stockId)
  return { error: error?.message ?? null }
}
