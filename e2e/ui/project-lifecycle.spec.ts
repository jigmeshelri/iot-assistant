import { test, expect } from '../fixtures/seeded-test'
import { SEED_IDS } from '../fixtures/seed'

test.describe('Project Lifecycle — AC-3.6.1 to AC-3.6.6', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  // ── AC-3.6.1: Create project with type + difficulty → redirects to detail ──
  test('AC-3.6.1: create project with type + difficulty redirects to project detail', async ({ page }) => {
    await page.goto('/projects/new')
    const titleInput = page.getByPlaceholder('Mi proyecto IoT')
    await expect(titleInput).toBeVisible({ timeout: 10_000 })

    await titleInput.fill('E2E-Lifecycle-Test')

    // Select type "Prototipo"
    await page.getByRole('button', { name: 'Prototipo' }).click()
    // Select difficulty "Intermedio"
    await page.getByRole('button', { name: 'Intermedio' }).click()

    await page.getByRole('button', { name: 'Crear proyecto' }).click()

    // Should redirect to /projects/<uuid>
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/, { timeout: 10_000 })

    // Project title should be displayed on the detail page
    await expect(page.getByRole('heading', { name: 'E2E-Lifecycle-Test' })).toBeVisible({ timeout: 10_000 })

    // Status badge should show "Guardado" (initial status is 'saved')
    await expect(page.getByText('Guardado')).toBeVisible()
  })

  // ── AC-3.6.2: Status transitions: Guardado → En curso → Completado ──
  test('AC-3.6.2: status transitions Guardado → En curso → Completado', async ({ page }) => {
    // Use the seeded in_progress project
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // Project is seeded as 'in_progress' — should show En progreso badge
    await expect(page.getByText('En progreso')).toBeVisible({ timeout: 10_000 })

    // Click "Completar" button
    const completarBtn = page.getByRole('button', { name: /Completar/i })
    await expect(completarBtn).toBeVisible()
    await completarBtn.click()

    // Status badge should update to Completado
    await expect(page.getByText('Completado')).toBeVisible({ timeout: 5_000 })
  })

  // ── AC-3.6.3: Edit title inline → persists after reload ──
  test('AC-3.6.3: edit project title inline persists after reload', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // Click the pencil icon next to the title
    const titleHeading = page.getByRole('heading', { name: 'Test-Proyecto-E2E' })
    await expect(titleHeading).toBeVisible({ timeout: 10_000 })

    const pencilBtn = page.locator('button[title="Editar título"]')
    await expect(pencilBtn).toBeVisible()
    await pencilBtn.click()

    // An input should appear with the current title
    const titleInput = page.locator('input.text-lg, input.text-xl').first()
    await expect(titleInput).toBeVisible({ timeout: 5_000 })

    // Clear and type new title
    await titleInput.fill('Test-Proyecto-E2E-Edited')
    await titleInput.press('Enter')

    // "Guardado" feedback should appear briefly
    await expect(page.getByText('Guardado').first()).toBeVisible({ timeout: 5_000 })

    // Reload and verify the title persisted
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Test-Proyecto-E2E-Edited' })).toBeVisible({ timeout: 10_000 })
  })

  // ── AC-3.6.4: Add log entry with tag → appears in timeline ──
  test('AC-3.6.4: add log entry with tag appears in timeline', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // Click "Añadir entrada a la bitácora" button
    const addBtn = page.getByRole('button', { name: /Añadir entrada a la bitácora/i })
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    // Select tag "Solución"
    const tagSelect = page.locator('select').filter({ hasText: /Progreso|Problema|Solución/i })
    await expect(tagSelect).toBeVisible()
    await tagSelect.selectOption('solution')

    // Fill in content
    const textarea = page.getByPlaceholder('¿Qué hiciste? ¿Qué encontraste?')
    await expect(textarea).toBeVisible()
    await textarea.fill('E2E-log-entry-test: solución implementada')

    // Submit the form
    await page.getByRole('button', { name: 'Guardar' }).click()

    // The new entry should appear in the timeline
    await expect(page.getByText('E2E-log-entry-test: solución implementada')).toBeVisible({ timeout: 10_000 })
  })

  // ── AC-3.6.5: Mark log entry as public ──
  test('AC-3.6.5: add log entry marked as public shows public indicator', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // Open the log entry form
    const addBtn = page.getByRole('button', { name: /Añadir entrada a la bitácora/i })
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    await addBtn.click()

    // Fill in content
    const textarea = page.getByPlaceholder('¿Qué hiciste? ¿Qué encontraste?')
    await textarea.fill('E2E-public-log-entry')

    // Check the "Visible públicamente" checkbox
    const publicCheckbox = page.getByRole('checkbox', { name: /Visible públicamente/i })
    await expect(publicCheckbox).toBeVisible()
    await publicCheckbox.check()
    await expect(publicCheckbox).toBeChecked()

    // Submit
    await page.getByRole('button', { name: 'Guardar' }).click()

    // The new entry should appear with the 🌍 Público indicator
    await expect(page.getByText('🌍 Público')).toBeVisible({ timeout: 10_000 })
  })

  // ── AC-3.6.6: Add component to BOM ──
  test('AC-3.6.6: add component to BOM appears in list', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // Click "+ Añadir componente"
    const addBomBtn = page.getByRole('button', { name: /Añadir componente/i })
    await expect(addBomBtn).toBeVisible({ timeout: 10_000 })
    await addBomBtn.click()

    // Fill in component name
    const nameInput = page.getByPlaceholder('Nombre del componente')
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill('Capacitor 100µF')

    // Set quantity to 3
    const qtyInput = page.locator('input[type="number"]').last()
    await qtyInput.fill('3')

    // Click "Guardar"
    await page.getByRole('button', { name: 'Guardar' }).first().click()

    // The new component should appear in the BOM table
    await expect(page.getByText('Capacitor 100µF')).toBeVisible({ timeout: 10_000 })
  })
})
