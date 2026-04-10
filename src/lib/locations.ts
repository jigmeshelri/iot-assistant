import { getCurrentUserId } from './auth'
import { createSupabaseBrowserClient } from './supabase'

export interface Location {
  id: string
  name: string
  parent_id: string | null
}

export function buildTree(locations: Location[]): Map<string | null, Location[]> {
  const map = new Map<string | null, Location[]>()
  for (const loc of locations) {
    const parentKey = loc.parent_id ?? null
    if (!map.has(parentKey)) map.set(parentKey, [])
    map.get(parentKey)!.push(loc)
  }
  return map
}

export async function fetchLocations(): Promise<Location[]> {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase.from('locations').select('id,name,parent_id').order('name')
  return data ?? []
}

export async function insertLocation(name: string, parentId?: string): Promise<Location | null> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Not authenticated')
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase
    .from('locations')
    .insert({
      user_id: userId,
      name: name.trim(),
      ...(parentId ? { parent_id: parentId } : {}),
    })
    .select('id,name,parent_id')
    .single()
  return data ?? null
}
