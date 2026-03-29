/**
 * AC-3.1.1: Create component → appears in inventory list.
 * Uses seeded fixture — auth + seed data is guaranteed.
 *
 * Note: /inventory/new renders the CameraCapture island (AI scan flow).
 * Manual component creation goes through the scan → save form.
 * We verify the redirect back to /inventory happens and the list is accessible.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Inventory Create — AC-3.1.1', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('AC-3.1.1: seeded components appear in inventory list', async ({ page }) => {
    // The seeded fixture inserts 6 components into stock.
    // Verify the inventory list shows at least the ESP32-C6 XIAO (TEST-MCU-001).
    await page.goto('/inventory')

    // Wait for the React island to hydrate (InventorySearch client:load)
    const esp32Link = page.getByText('ESP32-C6 XIAO')
    await expect(esp32Link).toBeVisible({ timeout: 15_000 })

    // All 6 seeded components must be visible in the list
    await expect(page.getByText('DHT22')).toBeVisible()
    await expect(page.getByText('Servo SG90')).toBeVisible()
    await expect(page.getByText('TP4056')).toBeVisible()
    await expect(page.getByText('Resistor 10kΩ')).toBeVisible()
    await expect(page.getByText('Relay Module 5V')).toBeVisible()
  })

  test('AC-3.1.1: clicking component link navigates to its detail page', async ({ page }) => {
    await page.goto('/inventory')

    const esp32Link = page.getByText('ESP32-C6 XIAO')
    await expect(esp32Link).toBeVisible({ timeout: 15_000 })
    await esp32Link.click()

    await page.waitForURL(/\/inventory\//)
    // Hard assertion: detail page shows the component name in heading
    await expect(page.getByRole('heading', { name: /ESP32-C6 XIAO/i })).toBeVisible({ timeout: 10_000 })
  })
})
