import { createSupabaseBrowserClient } from './supabase'

export interface AddComponentInput {
  sku: string
  name: string
  category: string
  platform_family: string | null
  technical_specs: Record<string, string>
  datasheet_url: string | null
  connectivity_caps: Record<string, boolean>
  quantity: number
  notes: string | null
  location_id: string | null
}

export async function addComponentToStock(
  input: AddComponentInput,
): Promise<{ componentId: string | null; error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { componentId: null, error: 'Not authenticated' }

  const { data: component, error: compErr } = await supabase
    .from('components')
    .upsert({
      sku: input.sku,
      name: input.name,
      category: input.category,
      platform_family: input.platform_family,
      technical_specs: input.technical_specs,
      datasheet_url: input.datasheet_url,
      connectivity_caps: input.connectivity_caps,
    }, { onConflict: 'sku' })
    .select()
    .single()
  if (compErr) return { componentId: null, error: compErr.message }

  const { error: stockErr } = await supabase
    .from('stock')
    .insert({
      user_id: user.id,
      component_id: component.id,
      quantity: input.quantity,
      notes: input.notes,
      location_id: input.location_id,
    })
  if (stockErr) return { componentId: null, error: stockErr.message }

  return { componentId: component.id, error: null }
}

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
