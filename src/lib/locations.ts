import { createSupabaseBrowserClient } from './supabase'

export async function insertLocation(name: string, parentId?: string) {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('locations').insert({
    user_id: user.id,
    name: name.trim(),
    ...(parentId ? { parent_id: parentId } : {}),
  })
}
