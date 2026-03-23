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

/**
 * Máxima versión de un filename en estado local.
 * SOLO usar para display. Para INSERTs, consultar MAX(version) desde Supabase.
 */
export function localMaxVersion(resources: SavedCodeResource[], filename: string): number {
  return resources
    .filter(r => r.filename === filename)
    .reduce((max, r) => Math.max(max, r.version), 0)
}
