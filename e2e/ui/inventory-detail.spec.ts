/**
 * AC-3.1.3: Detail view shows specs, datasheet, quantity, location.
 * AC-3.1.5: Delete component → disappears from inventory list.
 * AC-3.1.8: Stock +/− → persists after reload.
 *
 * Uses seeded fixture — ESP32-C6 XIAO (TEST-MCU-001) and DHT22 are guaranteed.
 *
 * Navigation strategy: inventory list links go to /inventory/{stock.id}.
 * We navigate via the component name link since stock UUIDs aren't in SEED_IDS.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Inventory Detail — AC-3.1.3, AC-3.1.5, AC-3.1.8', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  async function navigateToEsp32(page: import('@playwright/test').Page) {
    await page.goto('/inventory')
    const link = page.getByText('ESP32-C6 XIAO')
    await expect(link).toBeVisible({ timeout: 15_000 })
    await link.click()
    await page.waitForURL(/\/inventory\//)
    await page.waitForLoadState('networkidle')
  }

  test('AC-3.1.3: detail page shows SKU, category, specs, quantity and location', async ({ page }) => {
    await navigateToEsp32(page)

    // SKU
    await expect(page.getByText('TEST-MCU-001')).toBeVisible({ timeout: 10_000 })

    // Category badge
    await expect(page.getByText('MCU')).toBeVisible()

    // Technical specs — ESP32 seed has flash: 4MB, ram: 512KB
    await expect(page.getByText('4MB')).toBeVisible()
    await expect(page.getByText('512KB')).toBeVisible()

    // Quantity — seeded with 3 units
    await expect(page.getByText('3')).toBeVisible()

    // Location — ESP32 is assigned to Test-Taller
    await expect(page.getByText('Test-Taller')).toBeVisible()
  })

  test('AC-3.1.5: delete stock entry removes it from the inventory list', async ({ page }) => {
    // Navigate to Relay Module 5V (seeded qty=1, location=Cajita)
    // Using Relay so we don't remove ESP32 which other tests depend on
    await page.goto('/inventory')
    const relayLink = page.getByText('Relay Module 5V')
    await expect(relayLink).toBeVisible({ timeout: 15_000 })
    await relayLink.click()
    await page.waitForURL(/\/inventory\//)
    await page.waitForLoadState('networkidle')

    // The delete button is rendered by InventoryDetail island
    const deleteBtn = page.getByRole('button', { name: /Eliminar del inventario/i })
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept())
    await deleteBtn.click()

    // After deletion the component redirects to /inventory
    await page.waitForURL(/\/inventory$/, { timeout: 10_000 })

    // Relay Module 5V must no longer appear in the list
    await expect(page.getByText('Relay Module 5V')).not.toBeVisible({ timeout: 10_000 })
  })

  test('AC-3.1.8: stock + increments quantity and persists after page reload', async ({ page }) => {
    await navigateToEsp32(page)

    // StockAdjuster renders the quantity as a large text and + / − buttons
    const quantityEl = page.locator('span.text-3xl')
    await expect(quantityEl).toBeVisible({ timeout: 10_000 })

    const beforeText = await quantityEl.textContent()
    const before = parseInt(beforeText ?? '0', 10)
    // Seeded quantity for ESP32 is 3
    expect(before).toBe(3)

    // Click the + button
    const plusBtn = page.getByRole('button', { name: '+' })
    await expect(plusBtn).toBeVisible()
    await plusBtn.click()

    // Wait for the save confirmation
    await expect(page.getByText('✓ Guardado')).toBeVisible({ timeout: 5_000 })

    // Quantity must show 4 optimistically
    await expect(quantityEl).toHaveText('4')

    // Reload and verify it persisted to the DB
    await page.reload()
    await page.waitForLoadState('networkidle')
    const afterText = await page.locator('span.text-3xl').textContent()
    expect(parseInt(afterText ?? '0', 10)).toBe(4)
  })
})
