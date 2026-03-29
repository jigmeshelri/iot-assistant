/**
 * AC-3.1.7: Assign location to a component → component appears in that location's detail view.
 *
 * Strategy:
 * - Servo SG90 is seeded WITHOUT a location (location_id = null).
 * - We navigate to its detail, open inline edit, assign Test-Cajón via LocationPicker, save.
 * - Then navigate to /locations/{locationCajonId} and verify Servo SG90 appears.
 *
 * LocationPicker is a custom dropdown: a trigger button shows the current value,
 * clicking it opens a list of location divs, clicking one selects it.
 *
 * Uses seeded fixture — SEED_IDS.locationCajonId and Servo SG90 are guaranteed.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Inventory Location — AC-3.1.7', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('AC-3.1.7: assigning a location to a component shows it in the location view', async ({ page, ids }) => {
    // Step 1: navigate to Servo SG90 detail (seeded without location)
    await page.goto('/inventory')
    const servoLink = page.getByText('Servo SG90')
    await expect(servoLink).toBeVisible({ timeout: 15_000 })
    await servoLink.click()
    await page.waitForURL(/\/inventory\//)
    await page.waitForLoadState('networkidle')

    // Step 2: open inline edit
    const editBtn = page.getByRole('button', { name: /Editar componente/i })
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    // Step 3: the edit form is now visible — find the "Ubicación" section
    const locationLabel = page.getByText('Ubicación', { exact: true }).last()
    await expect(locationLabel).toBeVisible()

    // LocationPicker renders a trigger button showing "Sin ubicación" when no location assigned
    // It is the button immediately after the label within the edit form
    const locationTrigger = page.getByRole('button', { name: /Sin ubicación/i })
    await expect(locationTrigger).toBeVisible({ timeout: 5_000 })
    await locationTrigger.click()

    // The dropdown opens — click on "Test-Cajón" option
    // LocationPicker renders divs with the location names, not role="option"
    const cajonOption = page.getByText('Test-Cajón')
    await expect(cajonOption).toBeVisible({ timeout: 5_000 })
    await cajonOption.click()

    // The trigger button should now show the selected location name
    await expect(page.getByRole('button', { name: /Test-Cajón/i })).toBeVisible()

    // Step 4: save
    const saveBtn = page.getByRole('button', { name: /Guardar cambios/i })
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // After save the island calls window.location.reload()
    await page.waitForLoadState('networkidle')

    // Verify the location assignment is reflected on the detail page
    await expect(page.getByText('Test-Cajón')).toBeVisible({ timeout: 10_000 })

    // Step 5: navigate to Test-Cajón location detail and verify component appears there
    await page.goto(`/locations/${ids.locationCajonId}`)
    await page.waitForLoadState('networkidle')

    // Servo SG90 must appear in the component list of this location
    await expect(page.getByText('Servo SG90')).toBeVisible({ timeout: 10_000 })
  })
})
