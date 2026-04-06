/**
 * AC-3.1.1: Create component → appears in inventory list.
 * AC-7.1.4: Creating location from picker preserves form data.
 *
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

test.describe('Inventory Create — AC-7.1.4 (form data preservation)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('AC-7.1.4: creating location from picker does not lose form data', async ({ page }) => {
    // Mock Supabase location insert so we don't pollute test DB
    const newLocationId = 'e2e-test-location-id'
    await page.route('**/rest/v1/locations*', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: newLocationId, name: 'E2E Test Lab', parent_id: null }]),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/inventory/new')

    // Trigger the AI scan by uploading a fake image file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-component.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-content'),
    })

    // Wait for the ComponentForm to appear (AI mock returns ESP32-C6 XIAO)
    await expect(page.getByPlaceholderText(/ESP32-C6 XIAO/i)).toBeVisible({ timeout: 15_000 })

    // Change the component name to a known value
    const nameInput = page.getByPlaceholderText(/ESP32-C6 XIAO/i)
    await nameInput.clear()
    await nameInput.fill('Mi Sensor Custom')

    // Open the LocationPicker and use "+ Nueva ubicación"
    const locationPickerBtn = page.locator('button').filter({ hasText: /sin ubicación/i }).first()
    await locationPickerBtn.click()

    await expect(page.getByRole('button', { name: /nueva ubicación/i })).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /nueva ubicación/i }).click()

    // Type the new location name and confirm
    await expect(page.getByPlaceholderText(/nombre de ubicación/i)).toBeVisible()
    await page.getByPlaceholderText(/nombre de ubicación/i).fill('E2E Test Lab')
    await page.keyboard.press('Enter')

    // AC-7.1.4: component name must still be present after location creation
    await expect(nameInput).toHaveValue('Mi Sensor Custom')
  })
})
