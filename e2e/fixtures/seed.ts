import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createTestSupabaseClient() {
  return createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

// Deterministic IDs so specs can reference seeded data directly
export const SEED_IDS = {
  // Locations
  locationTallerId: 'aaaaaaaa-0001-4000-8000-000000000001',
  locationCajonId:  'aaaaaaaa-0002-4000-8000-000000000002',
  locationCajitaId: 'aaaaaaaa-0003-4000-8000-000000000003',

  // Components (catalog)
  compEsp32Id:       'bbbbbbbb-0001-4000-8000-000000000001',
  compDht22Id:       'bbbbbbbb-0002-4000-8000-000000000002',
  compServoId:       'bbbbbbbb-0003-4000-8000-000000000003',
  compTp4056Id:      'bbbbbbbb-0004-4000-8000-000000000004',
  compResistorId:    'bbbbbbbb-0005-4000-8000-000000000005',
  compRelayId:       'bbbbbbbb-0006-4000-8000-000000000006',

  // Project (in_progress)
  projectId:         'cccccccc-0001-4000-8000-000000000001',
  // Project (completed / published)
  projectDoneId:     'cccccccc-0002-4000-8000-000000000002',

  // BOM items
  bomEsp32Id:        'dddddddd-0001-4000-8000-000000000001',
  bomDht22Id:        'dddddddd-0002-4000-8000-000000000002',

  // Log entries
  logProgressId:     'eeeeeeee-0001-4000-8000-000000000001',
  logProblemId:      'eeeeeeee-0002-4000-8000-000000000002',
  logSolutionId:     'eeeeeeee-0003-4000-8000-000000000003',

  // Code resource
  codeResourceId:    'ffffffff-0001-4000-8000-000000000001',
} as const

export type SeedIds = typeof SEED_IDS

export async function seedTestData(supabase: SupabaseClient, userId: string) {
  // ----------------------------------------------------------------
  // 1. Component catalog — 6 components, different categories
  // ----------------------------------------------------------------
  const components = [
    {
      id: SEED_IDS.compEsp32Id,
      sku: 'TEST-MCU-001',
      name: 'ESP32-C6 XIAO',
      category: 'MCU',
      platform_family: 'ESP32',
      connectivity_caps: { wifi: true, ble: true, zigbee: true },
      technical_specs: { flash: '4MB', ram: '512KB' },
    },
    {
      id: SEED_IDS.compDht22Id,
      sku: 'TEST-SNS-001',
      name: 'DHT22',
      category: 'Sensor',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { range: '-40..80°C' },
    },
    {
      id: SEED_IDS.compServoId,
      sku: 'TEST-ACT-001',
      name: 'Servo SG90',
      category: 'Actuador',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { torque: '1.8kg/cm' },
    },
    {
      id: SEED_IDS.compTp4056Id,
      sku: 'TEST-PWR-001',
      name: 'TP4056',
      category: 'Alimentación',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { charge_current: '1A' },
    },
    {
      id: SEED_IDS.compResistorId,
      sku: 'TEST-PAS-001',
      name: 'Resistor 10kΩ',
      category: 'Pasivo',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { resistance: '10000', tolerance: '5%' },
    },
    {
      id: SEED_IDS.compRelayId,
      sku: 'TEST-MOD-001',
      name: 'Relay Module 5V',
      category: 'Módulo',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { max_current: '10A', coil_voltage: '5V' },
    },
  ]

  await supabase
    .from('components')
    .upsert(components, { onConflict: 'sku' })

  // ----------------------------------------------------------------
  // 2. Location hierarchy: Taller → Cajón → Cajita
  // ----------------------------------------------------------------
  await supabase.from('locations').upsert([
    {
      id: SEED_IDS.locationTallerId,
      user_id: userId,
      name: 'Test-Taller',
      parent_id: null,
    },
  ], { onConflict: 'id' })

  await supabase.from('locations').upsert([
    {
      id: SEED_IDS.locationCajonId,
      user_id: userId,
      name: 'Test-Cajón',
      parent_id: SEED_IDS.locationTallerId,
    },
  ], { onConflict: 'id' })

  await supabase.from('locations').upsert([
    {
      id: SEED_IDS.locationCajitaId,
      user_id: userId,
      name: 'Test-Cajita',
      parent_id: SEED_IDS.locationCajonId,
    },
  ], { onConflict: 'id' })

  // ----------------------------------------------------------------
  // 3. Stock entries — some with location, some without, one qty=0
  // ----------------------------------------------------------------
  const stockRows = [
    // With location (Taller)
    {
      user_id: userId,
      component_id: SEED_IDS.compEsp32Id,
      quantity: 3,
      location_id: SEED_IDS.locationTallerId,
      notes: 'Test seed — ESP32',
    },
    // With nested location (Cajón)
    {
      user_id: userId,
      component_id: SEED_IDS.compDht22Id,
      quantity: 5,
      location_id: SEED_IDS.locationCajonId,
      notes: 'Test seed — DHT22',
    },
    // Without location
    {
      user_id: userId,
      component_id: SEED_IDS.compServoId,
      quantity: 2,
      location_id: null,
      notes: 'Test seed — Servo',
    },
    // Without location
    {
      user_id: userId,
      component_id: SEED_IDS.compTp4056Id,
      quantity: 4,
      location_id: null,
      notes: 'Test seed — TP4056',
    },
    // qty = 0 (out of stock)
    {
      user_id: userId,
      component_id: SEED_IDS.compResistorId,
      quantity: 0,
      location_id: null,
      notes: 'Test seed — Resistor (agotado)',
    },
    // With deepest location (Cajita)
    {
      user_id: userId,
      component_id: SEED_IDS.compRelayId,
      quantity: 1,
      location_id: SEED_IDS.locationCajitaId,
      notes: 'Test seed — Relay',
    },
  ]

  await supabase
    .from('stock')
    .upsert(stockRows, { onConflict: 'user_id,component_id' })

  // ----------------------------------------------------------------
  // 4. Project in_progress with BOM, log entries, code resource
  // ----------------------------------------------------------------
  await supabase.from('projects').upsert([
    {
      id: SEED_IDS.projectId,
      user_id: userId,
      title: 'Test-Proyecto-E2E',
      description: 'Proyecto de prueba para tests E2E',
      status: 'in_progress',
      project_type: 'diy',
      difficulty: 'intermediate',
      source: 'manual',
      progress: 50,
      tags: ['test', 'e2e', 'iot'],
      is_public: false,
    },
  ], { onConflict: 'id' })

  // BOM items
  await supabase.from('project_bom').upsert([
    {
      id: SEED_IDS.bomEsp32Id,
      project_id: SEED_IDS.projectId,
      component_id: SEED_IDS.compEsp32Id,
      component_name: 'ESP32-C6 XIAO',
      quantity_required: 1,
    },
    {
      id: SEED_IDS.bomDht22Id,
      project_id: SEED_IDS.projectId,
      component_id: SEED_IDS.compDht22Id,
      component_name: 'DHT22',
      quantity_required: 2,
    },
  ], { onConflict: 'id' })

  // Log entries with different tags
  await supabase.from('project_log_entries').upsert([
    {
      id: SEED_IDS.logProgressId,
      project_id: SEED_IDS.projectId,
      user_id: userId,
      content: 'Avance inicial del proyecto de prueba E2E',
      tag: 'progress',
      is_public: false,
    },
    {
      id: SEED_IDS.logProblemId,
      project_id: SEED_IDS.projectId,
      user_id: userId,
      content: 'Problema detectado en la conexión del sensor',
      tag: 'problem',
      is_public: false,
    },
    {
      id: SEED_IDS.logSolutionId,
      project_id: SEED_IDS.projectId,
      user_id: userId,
      content: 'Solución: usar resistencia pull-up de 4.7kΩ',
      tag: 'solution',
      is_public: false,
    },
  ], { onConflict: 'id' })

  // Code resource
  await supabase.from('project_code_resources').upsert([
    {
      id: SEED_IDS.codeResourceId,
      project_id: SEED_IDS.projectId,
      filename: 'main.cpp',
      language: 'cpp',
      environment: 'arduino',
      content: '#include <DHT.h>\nvoid setup() {}\nvoid loop() {}',
      is_generated: true,
      version: 1,
    },
  ], { onConflict: 'id' })

  // ----------------------------------------------------------------
  // 5. Completed project (for publish/community tests later)
  // ----------------------------------------------------------------
  await supabase.from('projects').upsert([
    {
      id: SEED_IDS.projectDoneId,
      user_id: userId,
      title: 'Test-Proyecto-Completado',
      description: 'Proyecto completado para tests de publicación',
      status: 'completed',
      project_type: 'prototype',
      difficulty: 'beginner',
      source: 'manual',
      progress: 100,
      tags: ['test', 'completed'],
      is_public: false,
    },
  ], { onConflict: 'id' })
}

export async function clearTestData(supabase: SupabaseClient, userId: string) {
  // Delete in reverse dependency order to respect FK constraints

  // Code resources (depend on projects)
  await supabase
    .from('project_code_resources')
    .delete()
    .in('project_id', [SEED_IDS.projectId, SEED_IDS.projectDoneId])

  // Log entries (depend on projects)
  await supabase
    .from('project_log_entries')
    .delete()
    .in('project_id', [SEED_IDS.projectId, SEED_IDS.projectDoneId])

  // BOM items (depend on projects)
  await supabase
    .from('project_bom')
    .delete()
    .in('project_id', [SEED_IDS.projectId, SEED_IDS.projectDoneId])

  // Projects
  await supabase
    .from('projects')
    .delete()
    .in('id', [SEED_IDS.projectId, SEED_IDS.projectDoneId])

  // Stock referencing TEST- components
  const { data: testComponents } = await supabase
    .from('components')
    .select('id')
    .like('sku', 'TEST-%')

  if (testComponents && testComponents.length > 0) {
    const ids = testComponents.map((c) => c.id)
    await supabase.from('stock').delete().eq('user_id', userId).in('component_id', ids)
  }

  // Locations (deepest first to respect parent_id FK)
  await supabase
    .from('locations')
    .delete()
    .eq('id', SEED_IDS.locationCajitaId)

  await supabase
    .from('locations')
    .delete()
    .eq('id', SEED_IDS.locationCajonId)

  await supabase
    .from('locations')
    .delete()
    .eq('id', SEED_IDS.locationTallerId)
}
