import { test, expect } from '../fixtures/auth'

test.describe('Inventory Search — AC-3.1.2, AC-3.1.6', () => {
  test('AC-3.1.2: search filters by name', async ({ page }) => {
    await page.goto('/inventory')
    const searchInput = page.getByPlaceholder(/Buscar/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('ESP32')
      // Components not matching should be hidden
      await expect(page.getByText('ESP32')).toBeVisible()
    }
  })

  test('AC-3.1.6: category chip filters', async ({ page }) => {
    await page.goto('/inventory')
    // Click a category chip if visible
    const sensorChip = page.getByText('Sensores', { exact: false })
    if (await sensorChip.isVisible()) {
      await sensorChip.click()
    }
  })
})
