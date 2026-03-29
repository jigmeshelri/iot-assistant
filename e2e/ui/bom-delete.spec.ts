import { test, expect } from '../fixtures/seeded-test'
import { SEED_IDS } from '../fixtures/seed'

test.describe('BOM Delete — AC-3.6.8', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('AC-3.6.8: delete BOM item disappears from the list', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // Seeded BOM has "ESP32-C6 XIAO" and "DHT22"
    // Verify DHT22 is present before deletion
    await expect(page.getByText('DHT22').first()).toBeVisible({ timeout: 10_000 })

    // Hover over the DHT22 row to reveal the delete button (opacity-0 → group-hover:opacity-100)
    const dht22Row = page.locator('div.group').filter({ hasText: 'DHT22' }).first()
    await dht22Row.hover()

    // The delete button has aria-label="Eliminar"
    const deleteBtn = dht22Row.getByRole('button', { name: 'Eliminar' })
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 })

    // Accept the confirm dialog
    page.on('dialog', dialog => dialog.accept())
    await deleteBtn.click()

    // DHT22 should no longer be visible in the BOM
    await expect(page.getByText('DHT22').first()).not.toBeVisible({ timeout: 5_000 })
  })
})
