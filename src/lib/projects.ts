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

export interface CreateProjectInput {
  title: string
  description: string | null
  projectType: string
  difficulty: string
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not authenticated' } }
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description,
      project_type: input.projectType,
      difficulty: input.difficulty,
      status: 'saved',
      source: 'manual',
    })
    .select()
    .single()
  return { data, error }
}

export interface PublishProjectInput {
  title: string
  description: string | null
  difficulty: string
  tags: string[]
}

export interface LogVisibility {
  id: string
  is_public: boolean
}

export async function publishProject(
  projectId: string,
  input: PublishProjectInput,
  logUpdates: LogVisibility[],
): Promise<{ error: { message: string } | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error: projErr } = await supabase
    .from('projects')
    .update({ is_public: true, title: input.title, description: input.description, difficulty: input.difficulty, tags: input.tags })
    .eq('id', projectId)
  if (projErr) return { error: projErr }
  for (const log of logUpdates) {
    await supabase.from('project_log_entries').update({ is_public: log.is_public }).eq('id', log.id)
  }
  return { error: null }
}

export async function unpublishProject(
  projectId: string,
): Promise<{ error: { message: string } | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('projects').update({ is_public: false }).eq('id', projectId)
  return { error }
}

export interface SaveAIProjectBOMItem {
  component_name: string
  quantity_required?: number
  notes?: string | null
}

export interface SaveAIProjectInput {
  title: string
  description: string
  source: string
  difficulty: string | null
  tags: string[]
  bom?: SaveAIProjectBOMItem[]
}

export async function forkProject(
  projectId: string,
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: original } = await supabase
    .from('projects')
    .select('title, description, project_type, difficulty, tags')
    .eq('id', projectId)
    .single()
  if (!original) return { error: 'Project not found' }

  const { error } = await supabase.from('projects').insert({
    user_id: user.id,
    parent_project_id: projectId,
    title: `${original.title} (fork)`,
    description: original.description,
    project_type: original.project_type,
    difficulty: original.difficulty,
    tags: original.tags,
    source: 'fork',
  })
  return { error: error?.message ?? null }
}

export interface AddLogEntryInput {
  projectId: string
  content: string
  tag: string
  isPublic: boolean
}

export interface LogEntry {
  id: string
  content: string
  tag: string
  is_public: boolean
  created_at: string
}

export async function addLogEntry(
  input: AddLogEntryInput,
): Promise<{ data: LogEntry | null; error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('project_log_entries')
    .insert({
      project_id: input.projectId,
      user_id: user.id,
      content: input.content,
      tag: input.tag,
      is_public: input.isPublic,
    })
    .select()
    .single()
  return { data: error ? null : (data as LogEntry), error: error?.message ?? null }
}

export async function saveAIProject(
  input: SaveAIProjectInput,
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'No autenticado' } }
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description,
      source: input.source,
      project_type: 'diy',
      difficulty: input.difficulty,
      tags: input.tags,
    })
    .select()
    .single()

  if (!error && data && input.bom && input.bom.length > 0) {
    const rows = input.bom
      .filter(item => item.component_name && item.component_name.trim() !== '')
      .map(item => ({
        project_id: data.id,
        component_name: item.component_name.trim(),
        quantity_required: item.quantity_required ?? 1,
        notes: item.notes ?? null,
      }))
    if (rows.length > 0) {
      await supabase.from('project_bom').insert(rows)
    }
  }

  return { data, error }
}
