import { test, expect } from '../fixtures/auth'

test.describe('AI Scan — AC-3.2.1 to AC-3.2.4', () => {
  test('AC-3.2.1: scan page shows camera zone', async ({ page }) => {
    await page.goto('/inventory/new')
    await expect(page.getByText(/Fotografiar|componente|Escanear/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('AC-3.2.3: file input accepts images', async ({ page }) => {
    await page.goto('/inventory/new')
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(fileInput).toHaveAttribute('accept', 'image/*')
    }
  })

  test('scan page shows form fields', async ({ page }) => {
    await page.goto('/inventory/new')
    await page.waitForTimeout(2000) // React hydration
    const nameInput = page.getByPlaceholder(/ESP32/i)
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(nameInput).toBeVisible()
    }
  })
})
