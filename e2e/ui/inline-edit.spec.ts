/**
 * AC-3.1.4: User can edit a component inline and changes persist after page reload.
 * Uses seeded-test fixture — seed guarantees ESP32-C6 XIAO (TEST-MCU-001) exists.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Inline edit persistence — AC-3.1.4', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  async function navigateToSeededComponent(page: import('@playwright/test').Page) {
    await page.goto('/inventory')
    const link = page.getByText('ESP32-C6 XIAO')
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await page.waitForURL(/\/inventory\//)
    await page.waitForLoadState('networkidle')
  }

  test('AC-3.1.4: edited name persists after page reload', async ({ page }) => {
    await navigateToSeededComponent(page)

    // Open inline edit form
    const editBtn = page.getByRole('button', { name: /editar componente/i })
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Edit form must be shown — hard assertion
    const nameInput = page.getByLabel(/nombre/i)
    await expect(nameInput).toBeVisible()

    // Clear and type a new name
    const newName = 'ESP32-C6 XIAO Editado'
    await nameInput.clear()
    await nameInput.fill(newName)

    // Save
    const saveBtn = page.getByRole('button', { name: /guardar cambios/i })
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // After save the page reloads — wait for networkidle
    await page.waitForLoadState('networkidle')

    // The new name must now be visible in view mode
    await expect(page.getByText(newName)).toBeVisible({ timeout: 10_000 })

    // Reload the page and verify the change persisted to the DB
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(newName)).toBeVisible({ timeout: 10_000 })
  })

  test('AC-3.1.4: cancel inline edit keeps original value', async ({ page }) => {
    await navigateToSeededComponent(page)

    // Capture the original name shown in view mode
    const originalName = 'ESP32-C6 XIAO'
    await expect(page.getByText(originalName)).toBeVisible()

    // Open inline edit form
    const editBtn = page.getByRole('button', { name: /editar componente/i })
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Edit the name without saving
    const nameInput = page.getByLabel(/nombre/i)
    await expect(nameInput).toBeVisible()
    await nameInput.clear()
    await nameInput.fill('Nombre Descartado')

    // Cancel — must not save to DB
    const cancelBtn = page.getByRole('button', { name: /cancelar/i })
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // View mode restored — original name must be shown, discarded value must not appear
    await expect(page.getByRole('button', { name: /editar componente/i })).toBeVisible()
    await expect(page.getByText('Nombre Descartado')).not.toBeVisible()

    // Reload and confirm original value still in DB
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(originalName)).toBeVisible({ timeout: 10_000 })
  })
})
