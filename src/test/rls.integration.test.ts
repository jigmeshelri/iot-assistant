// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Load .env.test if env vars not already set
if (!process.env.PUBLIC_SUPABASE_URL) {
  try {
    for (const line of readFileSync('.env.test', 'utf-8').split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) process.env[match[1].trim()] ??= match[2].trim()
    }
  } catch { /* .env.test not found — env vars must be set externally */ }
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}. Check your .env.test file.`)
  return value
}

async function signInAs(email: string, password: string, label: string): Promise<SupabaseClient> {
  if (!SUPABASE_URL) throw new Error('Missing env var: PUBLIC_SUPABASE_URL')
  if (!SUPABASE_ANON_KEY)
    throw new Error(
      'Missing env var: PUBLIC_SUPABASE_ANON_KEY or PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    )

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(
      `Auth failed for ${label} (${email}): ${error.message}. ` +
        `Verify ${label}_EMAIL and ${label}_PASSWORD in .env.test`
    )
  }
  return client
}

describe('RLS data isolation', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient

  let stockAId: string
  let stockBId: string
  let locationAId: string
  let locationBId: string

  beforeAll(async () => {
    const emailA = requireEnv('TEST_USER_A_EMAIL')
    const passwordA = requireEnv('TEST_USER_A_PASSWORD')
    const emailB = requireEnv('TEST_USER_B_EMAIL')
    const passwordB = requireEnv('TEST_USER_B_PASSWORD')

    ;[clientA, clientB] = await Promise.all([
      signInAs(emailA, passwordA, 'TEST_USER_A'),
      signInAs(emailB, passwordB, 'TEST_USER_B'),
    ])

    // Fetch User A's own data
    const { data: stockA, error: stockAError } = await clientA
      .from('stock')
      .select('id')
      .limit(1)
      .single()

    if (stockAError || !stockA) {
      throw new Error(
        `Could not fetch seed stock for User A: ${stockAError?.message ?? 'no rows'}. ` +
          'Ensure User A has at least 1 stock item in the database.'
      )
    }
    stockAId = stockA.id

    const { data: locationA, error: locationAError } = await clientA
      .from('locations')
      .select('id')
      .limit(1)
      .single()

    if (locationAError || !locationA) {
      throw new Error(
        `Could not fetch seed location for User A: ${locationAError?.message ?? 'no rows'}. ` +
          'Ensure User A has at least 1 location in the database.'
      )
    }
    locationAId = locationA.id

    // Fetch User B's own data
    const { data: stockB, error: stockBError } = await clientB
      .from('stock')
      .select('id')
      .limit(1)
      .single()

    if (stockBError || !stockB) {
      throw new Error(
        `Could not fetch seed stock for User B: ${stockBError?.message ?? 'no rows'}. ` +
          'Ensure User B has at least 1 stock item in the database.'
      )
    }
    stockBId = stockB.id

    const { data: locationB, error: locationBError } = await clientB
      .from('locations')
      .select('id')
      .limit(1)
      .single()

    if (locationBError || !locationB) {
      throw new Error(
        `Could not fetch seed location for User B: ${locationBError?.message ?? 'no rows'}. ` +
          'Ensure User B has at least 1 location in the database.'
      )
    }
    locationBId = locationB.id
  })

  afterAll(async () => {
    await clientA?.auth.signOut()
    await clientB?.auth.signOut()
  })

  it('User A cannot see User B stock', async () => {
    const { data, error } = await clientA.from('stock').select('id')

    expect(error).toBeNull()

    const ids = (data ?? []).map((row) => row.id)
    expect(ids).not.toContain(stockBId)
  })

  it('User A cannot see User B locations', async () => {
    const { data, error } = await clientA.from('locations').select('id')

    expect(error).toBeNull()

    const ids = (data ?? []).map((row) => row.id)
    expect(ids).not.toContain(locationBId)
  })

  it('User A cannot update User B stock', async () => {
    // Attempt update — RLS should silently block it (0 rows affected) or return an error
    const { error } = await clientA
      .from('stock')
      .update({ quantity: 9999, notes: 'hacked' })
      .eq('id', stockBId)
    expect(error).toBeNull() // RLS silently filters — 0 rows affected, no error

    // Verify from User B's perspective that the data is unchanged
    const { data: stockB } = await clientB
      .from('stock')
      .select('quantity, notes')
      .eq('id', stockBId)
      .single()

    expect(stockB?.quantity).not.toBe(9999)
    expect(stockB?.notes).not.toBe('hacked')
  })

  it('User A cannot delete User B locations', async () => {
    // Attempt delete — RLS should silently block it or return an error
    const { error } = await clientA.from('locations').delete().eq('id', locationBId)
    expect(error).toBeNull() // RLS silently filters — 0 rows affected, no error

    // Verify from User B's perspective that the location still exists
    const { data: locationB } = await clientB
      .from('locations')
      .select('id')
      .eq('id', locationBId)
      .maybeSingle()

    expect(locationB?.id).toBe(locationBId)
  })
})
