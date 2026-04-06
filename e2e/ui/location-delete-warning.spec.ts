/**
 * AC-3.3.5: Delete location with warning
 *
 * When deleting a location that has components assigned, the system shows
 * a confirmation warning before proceeding.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('AC-3.3.5: Delete location with warning', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('shows warning with component count when deleting a location that has components', async ({ page }) => {
    // Navigate to locations list — seed guarantees Test-Taller exists
    await page.goto('/locations')
    const tallerLink = page.getByText('Test-Taller')
    await expect(tallerLink).toBeVisible({ timeout: 10_000 })
    await tallerLink.click()

    // Wait for the location detail page to load
    await page.waitForLoadState('networkidle')

    // The LocationManager island renders the "Eliminar ubicación" button
    const deleteBtn = page.getByRole('button', { name: /Eliminar ubicación/i })
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })

    // Capture the dialog before clicking — seed assigns 1 stock item to Test-Taller
    const dialogPromise = page.waitForEvent('dialog')
    await deleteBtn.click()
    const dialog = await dialogPromise

    // Hard assertion: warning message must mention the component count
    expect(dialog.message()).toContain('1 componentes')

    // Dismiss — do not actually delete so cleanup can run
    await dialog.dismiss()

    // Page stays on the location detail (no redirect)
    await expect(page.url()).toContain('/locations/')
  })

  test('deletes the location and redirects to /locations when user confirms', async ({ page }) => {
    // Navigate to the sub-location (Test-Cajón) which has no components — simpler delete
    // But the AC requires testing the confirmed delete path for a location with components,
    // so we use Test-Taller (stockCount = 1) and accept the dialog.
    await page.goto('/locations')
    const tallerLink = page.getByText('Test-Taller')
    await expect(tallerLink).toBeVisible({ timeout: 10_000 })
    await tallerLink.click()

    await page.waitForLoadState('networkidle')

    const deleteBtn = page.getByRole('button', { name: /Eliminar ubicación/i })
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })

    // Accept the confirmation dialog
    page.on('dialog', (dialog) => dialog.accept())
    await deleteBtn.click()

    // After confirming, the component redirects to /locations
    await page.waitForURL('**/locations', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/locations$/)
  })
})
