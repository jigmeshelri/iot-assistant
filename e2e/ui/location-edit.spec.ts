/**
 * AC-3.3.4: Edit location name → persists after reload.
 *
 * LocationManager renders:
 * - h2 showing the current name with an edit pencil button beside it
 * - Clicking the pencil → the h2 becomes an input (same element, editing state)
 * - Press Enter or blur → saves to DB via Supabase, shows "Guardado" briefly
 *
 * Uses seeded fixture — Test-Cajita (deepest node, no components) is ideal
 * for editing without side effects on other tests.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Location Edit — AC-3.3.4', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('AC-3.3.4: edit location name via inline editor and verify it persists', async ({ page, ids }) => {
    // Navigate directly to Test-Cajita detail using its known ID
    await page.goto(`/locations/${ids.locationCajitaId}`)
    await page.waitForLoadState('networkidle')

    // LocationManager renders h2 "Test-Cajita" and a pencil edit button beside it
    const heading = page.getByText('Test-Cajita').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })

    // Click the pencil button (title="Editar nombre")
    const editPencil = page.getByTitle('Editar nombre')
    await expect(editPencil).toBeVisible()
    await editPencil.click()

    // The input replaces the h2 — it is an input with the current name value
    const nameInput = page.locator('input').filter({ hasValue: 'Test-Cajita' })
    await expect(nameInput).toBeVisible({ timeout: 5_000 })

    // Clear and type the new name
    await nameInput.clear()
    await nameInput.fill('Test-Cajita-Editada')

    // Press Enter to save
    await nameInput.press('Enter')

    // "Guardado" confirmation must appear briefly
    await expect(page.getByText('Guardado')).toBeVisible({ timeout: 5_000 })

    // The h2 must now show the updated name
    await expect(page.getByText('Test-Cajita-Editada').first()).toBeVisible({ timeout: 5_000 })

    // Reload and verify the change persisted to the DB
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Test-Cajita-Editada').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Test-Cajita')).not.toBeVisible()
  })

  test('AC-3.3.4: pressing Escape discards the edit and keeps the original name', async ({ page, ids }) => {
    await page.goto(`/locations/${ids.locationCajonId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Test-Cajón').first()).toBeVisible({ timeout: 10_000 })

    const editPencil = page.getByTitle('Editar nombre')
    await expect(editPencil).toBeVisible()
    await editPencil.click()

    const nameInput = page.locator('input').filter({ hasValue: 'Test-Cajón' })
    await expect(nameInput).toBeVisible({ timeout: 5_000 })

    await nameInput.clear()
    await nameInput.fill('Nombre Descartado')

    // Press Escape — LocationManager resets to initialName and exits editing
    await nameInput.press('Escape')

    // Original name must be shown, discarded value must not appear
    await expect(page.getByTitle('Editar nombre')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Nombre Descartado')).not.toBeVisible()

    // Reload and confirm original value still in DB
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Test-Cajón').first()).toBeVisible({ timeout: 10_000 })
  })
})
