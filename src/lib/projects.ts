import { createSupabaseBrowserClient } from './supabase'

export async function updateProjectField(
  projectId: string,
  fields: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('projects').update(fields).eq('id', projectId)
  return { error }
}

export async function deleteProject(
  projectId: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  return { error }
}
