import { createSupabaseBrowserClient } from './supabase'

export interface Location {
  id: string
  name: string
  parent_id: string | null
}

export async function fetchLocations(): Promise<Location[]> {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase.from('locations').select('id,name,parent_id').order('name')
  return data ?? []
}

export async function insertLocation(name: string, parentId?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('locations').insert({
    user_id: user.id,
    name: name.trim(),
    ...(parentId ? { parent_id: parentId } : {}),
  })
}

export async function createLocation(name: string): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('locations').insert({
    user_id: user.id,
    name: name.trim(),
    parent_id: null,
  }).select()
  return data?.[0]?.id ?? null
}
