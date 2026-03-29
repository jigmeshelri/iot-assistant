import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// User B credentials (test DB)
const USER_B_ID   = 'a0da7e11-c9d9-42c6-b9c0-eb76437ac03d'
const USER_B_EMAIL = 'testb@iot-assistant.local'
const USER_B_PASS  = 'Test1234!'

// Deterministic IDs for User B's public project
export const COMMUNITY_SEED_IDS = {
  projectId:    'f0000000-0001-4000-8000-000000000001',
  bomItem1Id:   'f0000000-0002-4000-8000-000000000001',
  bomItem2Id:   'f0000000-0002-4000-8000-000000000002',
  logEntry1Id:  'f0000000-0003-4000-8000-000000000001',
  logEntry2Id:  'f0000000-0003-4000-8000-000000000002',
} as const

export type CommunitySeedIds = typeof COMMUNITY_SEED_IDS

/**
 * Seeds a published project owned by User B.
 * Uses User B's own authenticated Supabase client (to satisfy RLS).
 * Returns a signed-in client so callers can do additional operations if needed.
 */
export async function seedCommunityData(): Promise<SupabaseClient> {
  const supabaseUrl  = process.env.PUBLIC_SUPABASE_URL!
  const supabaseKey  = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: USER_B_EMAIL,
    password: USER_B_PASS,
  })

  if (error || !data.session) {
    throw new Error(`[community-seed] Sign-in for User B failed: ${error?.message}`)
  }

  // Public project owned by User B
  await supabase.from('projects').upsert([
    {
      id: COMMUNITY_SEED_IDS.projectId,
      user_id: USER_B_ID,
      title: 'Test-Proyecto-Comunidad',
      description: 'Proyecto público de prueba para tests de comunidad (fork, comentarios, visibilidad)',
      status: 'completed',
      project_type: 'diy',
      difficulty: 'beginner',
      source: 'manual',
      progress: 100,
      tags: ['community', 'test', 'iot'],
      is_public: true,
    },
  ], { onConflict: 'id' })

  // Public BOM items
  await supabase.from('project_bom').upsert([
    {
      id: COMMUNITY_SEED_IDS.bomItem1Id,
      project_id: COMMUNITY_SEED_IDS.projectId,
      component_name: 'ESP32-C6 XIAO',
      quantity_required: 1,
      notes: null,
    },
    {
      id: COMMUNITY_SEED_IDS.bomItem2Id,
      project_id: COMMUNITY_SEED_IDS.projectId,
      component_name: 'DHT22',
      quantity_required: 1,
      notes: null,
    },
  ], { onConflict: 'id' })

  // Public log entries (visible to community)
  await supabase.from('project_log_entries').upsert([
    {
      id: COMMUNITY_SEED_IDS.logEntry1Id,
      project_id: COMMUNITY_SEED_IDS.projectId,
      user_id: USER_B_ID,
      content: 'Proyecto terminado y publicado para la comunidad',
      tag: 'progress',
      is_public: true,
    },
    {
      id: COMMUNITY_SEED_IDS.logEntry2Id,
      project_id: COMMUNITY_SEED_IDS.projectId,
      user_id: USER_B_ID,
      content: 'Consejo: usar resistencia pull-up en el pin de datos del DHT22',
      tag: 'learning',
      is_public: true,
    },
  ], { onConflict: 'id' })

  return supabase
}

/**
 * Deletes all data seeded by seedCommunityData().
 * Requires User B's authenticated client (returned by seedCommunityData).
 */
export async function clearCommunityData(supabaseB: SupabaseClient): Promise<void> {
  // Log entries (depend on project)
  await supabaseB
    .from('project_log_entries')
    .delete()
    .eq('project_id', COMMUNITY_SEED_IDS.projectId)

  // BOM items (depend on project)
  await supabaseB
    .from('project_bom')
    .delete()
    .eq('project_id', COMMUNITY_SEED_IDS.projectId)

  // Project itself
  await supabaseB
    .from('projects')
    .delete()
    .eq('id', COMMUNITY_SEED_IDS.projectId)
}
