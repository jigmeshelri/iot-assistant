import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createTestSupabaseClient() {
  return createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

export async function seedTestData(supabase: SupabaseClient, userId: string) {
  // Upsert shared component catalog entries (prefixed TEST- to avoid collisions)
  const components = [
    {
      sku: 'TEST-MCU-001',
      name: 'ESP32-C6 XIAO',
      category: 'Microcontrolador',
      platform_family: 'ESP32',
      connectivity_caps: { wifi: true, ble: true, zigbee: true },
      technical_specs: { flash: '4MB', ram: '512KB' },
    },
    {
      sku: 'TEST-SNS-001',
      name: 'DHT22',
      category: 'Sensor',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { range: '-40..80°C' },
    },
    {
      sku: 'TEST-ACT-001',
      name: 'Servo SG90',
      category: 'Actuador',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { torque: '1.8kg/cm' },
    },
    {
      sku: 'TEST-PWR-001',
      name: 'TP4056',
      category: 'Alimentación',
      platform_family: null,
      connectivity_caps: {},
      technical_specs: { charge_current: '1A' },
    },
  ]

  const { data: inserted } = await supabase
    .from('components')
    .upsert(components, { onConflict: 'sku' })
    .select('id, sku')

  if (!inserted) return

  // Add stock entries for test user
  const stockRows = inserted.map((c) => ({
    user_id: userId,
    component_id: c.id,
    quantity: 5,
    notes: 'Test seed',
  }))

  await supabase.from('stock').upsert(stockRows, { onConflict: 'user_id,component_id' })

  // Add a project
  await supabase.from('projects').upsert(
    [
      {
        user_id: userId,
        title: 'Estación meteorológica',
        description: 'Monitor temp/humedad con ESP32 y DHT22',
        type: 'iot',
        status: 'in_progress',
        progress: 40,
      },
    ],
    { onConflict: 'user_id,title' },
  )
}

export async function clearTestData(supabase: SupabaseClient, userId: string) {
  // Remove user stock referencing TEST- components
  const { data: testComponents } = await supabase
    .from('components')
    .select('id')
    .like('sku', 'TEST-%')

  if (testComponents && testComponents.length > 0) {
    const ids = testComponents.map((c) => c.id)
    await supabase.from('stock').delete().eq('user_id', userId).in('component_id', ids)
  }

  await supabase.from('projects').delete().eq('user_id', userId).like('title', '%meteorológica%')
}
