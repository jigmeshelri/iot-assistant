import { test, expect } from '../fixtures/auth'

test.describe('Inventory Create — AC-3.1.1, AC-3.1.7', () => {
  test('AC-3.1.1: create component manually', async ({ page }) => {
    await page.goto('/inventory/new')
    // Fill form
    await page.getByPlaceholder(/ESP32/i).fill('Test-Component-E2E')
    // Submit
    await page.getByRole('button', { name: /Guardar/i }).click()
    // Should redirect to inventory and show the new component
    await page.waitForURL('/inventory')
    await expect(page.getByText('Test-Component-E2E')).toBeVisible()
  })
})
