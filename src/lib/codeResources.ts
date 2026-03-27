import { createSupabaseBrowserClient } from './supabase'

export interface SavedCodeResource {
  id:           string
  project_id:   string
  filename:     string
  language:     string
  environment:  string | null
  content:      string
  version:      number
  parent_id:    string | null
  is_generated: boolean
  created_at:   string
}

export interface SaveResourceOpts {
  filename:    string
  language:    string
  environment: string | null
  content:     string
  isGenerated: boolean
  parentId:    string | null
}

/**
 * Máxima versión de un filename en estado local.
 * SOLO usar para display. Para INSERTs, consultar MAX(version) desde Supabase.
 */
export function localMaxVersion(resources: SavedCodeResource[], filename: string): number {
  return resources
    .filter(r => r.filename === filename)
    .reduce((max, r) => Math.max(max, r.version), 0)
}

export async function getAuthToken(): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return session.access_token
}

export async function fetchMaxVersion(projectId: string, filename: string): Promise<number> {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase
    .from('project_code_resources')
    .select('version')
    .eq('project_id', projectId)
    .eq('filename', filename)
  if (!data || data.length === 0) return 0
  return Math.max(...data.map((r: { version: number }) => r.version))
}

export async function saveCodeResource(
  projectId: string,
  opts: SaveResourceOpts,
): Promise<SavedCodeResource> {
  const supabase = createSupabaseBrowserClient()
  let version = (await fetchMaxVersion(projectId, opts.filename)) + 1
  let attempt = 0
  while (attempt < 3) {
    const { data, error: err } = await supabase
      .from('project_code_resources')
      .insert({
        project_id:   projectId,
        filename:     opts.filename,
        language:     opts.language,
        environment:  opts.environment,
        content:      opts.content,
        version,
        parent_id:    opts.parentId,
        is_generated: opts.isGenerated,
      })
      .select()
      .single()
    if (!err && data) return data as SavedCodeResource
    if (err?.code === '23505') { version++; attempt++; continue }
    throw new Error(err?.message ?? 'Error guardando recurso')
  }
  throw new Error('Conflicto de versión — demasiados reintentos')
}

export async function deleteCodeResource(projectId: string, resourceId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { error: err } = await supabase
    .from('project_code_resources')
    .delete()
    .eq('id', resourceId)
    .eq('project_id', projectId)
  if (err) throw new Error(err.message)
}
