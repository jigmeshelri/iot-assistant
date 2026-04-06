import { test, expect } from '../fixtures/seeded-test'

test.describe('BOM Quantity Edit — AC-3.6.7', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('AC-3.6.7: user can edit BOM item quantity inline', async ({ page }) => {
    // Navigate to the seeded test project
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const main = page.locator('main').last()

    // Find the seeded project link
    const projLink = main.locator('a[href^="/projects/"]', {
      hasText: 'Test-Proyecto-E2E',
    }).first()
    await expect(projLink).toBeVisible({ timeout: 10_000 })
    await projLink.click()

    await page.waitForLoadState('networkidle')

    // The seeded BOM has ESP32-C6 (qty 1) and DHT22 (qty 2)
    // Verify initial state — DHT22 shows ×2
    const dht22Qty = page.getByRole('button', { name: '×2' })
    await expect(dht22Qty).toBeVisible({ timeout: 10_000 })

    // Click the quantity button to start editing
    await dht22Qty.click()

    // An input should appear for inline editing
    const qtyInput = page.locator('input[type="number"]').first()
    await expect(qtyInput).toBeVisible({ timeout: 5_000 })

    // Clear and type new quantity
    await qtyInput.fill('5')
    await qtyInput.press('Enter')

    // The new quantity should be displayed
    const updatedQty = page.getByRole('button', { name: '×5' })
    await expect(updatedQty).toBeVisible({ timeout: 5_000 })
  })
})
