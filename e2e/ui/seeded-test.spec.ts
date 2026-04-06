/**
 * Smoke test: verifies the seeded-test fixture works correctly.
 * With seed data guaranteed, we can use hard assertions — no soft guards.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Seeded fixture smoke test', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('inventory page shows seeded ESP32-C6 XIAO component', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page.getByText('ESP32-C6 XIAO')).toBeVisible({ timeout: 10_000 })
  })

  test('locations page shows seeded Test-Taller location', async ({ page }) => {
    await page.goto('/locations')
    await expect(page.getByText('Test-Taller')).toBeVisible({ timeout: 10_000 })
  })
})
