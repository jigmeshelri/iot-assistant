import { createSupabaseBrowserClient } from './supabase'
import type { BOMItem } from './types'

export async function addBomItem(
  projectId: string,
  name: string,
  quantity: number,
): Promise<BOMItem | null> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('project_bom')
    .insert({ project_id: projectId, component_name: name, quantity_required: quantity })
    .select()
    .single()
  if (error || !data) return null
  return data as BOMItem
}

export async function updateBomQty(id: string, quantity: number): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  await supabase.from('project_bom').update({ quantity_required: quantity }).eq('id', id)
}

export async function deleteBomItem(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  await supabase.from('project_bom').delete().eq('id', id)
}
