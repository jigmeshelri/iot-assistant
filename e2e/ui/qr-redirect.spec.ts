import { test, expect } from '../fixtures/seeded-test'
import { SEED_IDS } from '../fixtures/seed'
import { createClient } from '@supabase/supabase-js'

test.describe('QR Redirect — AC-3.4.2', () => {
  test('AC-3.4.2: /l/[qr_code] redirects to location detail', async ({ page }) => {
    // Fetch the qr_code for the seeded Test-Taller location at runtime
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: location } = await supabase
      .from('locations')
      .select('id, qr_code')
      .eq('id', SEED_IDS.locationTallerId)
      .single()

    expect(location).not.toBeNull()
    expect(location!.qr_code).toBeTruthy()

    // Navigate to the QR redirect route
    await page.goto(`/l/${location!.qr_code}`)

    // Should redirect to the location detail page
    await expect(page).toHaveURL(`/locations/${SEED_IDS.locationTallerId}`, { timeout: 10_000 })

    // Location name should be visible
    await expect(page.getByText('Test-Taller')).toBeVisible({ timeout: 5_000 })
  })
})
