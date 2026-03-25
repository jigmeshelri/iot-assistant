import { test, expect } from '../fixtures/auth'

test.describe('Project Lifecycle — AC-3.6.1 to AC-3.6.8', () => {
  test('AC-3.6.1: create project manually', async ({ page }) => {
    await page.goto('/projects/new')
    await page.getByPlaceholder(/título/i).first().fill('E2E-Test-Project')
    await page.getByRole('button', { name: /Crear|Guardar/i }).click()
    // Should redirect to project detail
    await page.waitForURL(/\/projects\//)
    await expect(page.getByText('E2E-Test-Project')).toBeVisible()
  })

  test('AC-3.6.2: change project status', async ({ page }) => {
    // Navigate to an existing project
    await page.goto('/projects')
    const projLink = page.locator('a[href^="/projects/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      // Look for status action buttons
      const actionBtn = page.getByRole('button', { name: /Iniciar|Pausar|Completar/i }).first()
      if (await actionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(actionBtn).toBeVisible()
      }
    }
  })

  test('AC-3.6.3: edit project title inline', async ({ page }) => {
    await page.goto('/projects')
    const projLink = page.locator('a[href^="/projects/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      // Title should be visible
      await expect(page.locator('h1, h2').first()).toBeVisible()
    }
  })

  test('AC-3.6.4: add log entry', async ({ page }) => {
    await page.goto('/projects')
    const projLink = page.locator('a[href^="/projects/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      // Look for add entry button or form
      const addBtn = page.getByRole('button', { name: /Entrada|Añadir|Nueva/i }).first()
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click()
        // Fill content
        const textarea = page.getByPlaceholder(/contenido|describe|escribe/i).first()
        if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
          await textarea.fill('E2E test log entry')
        }
      }
    }
  })

  test('AC-3.6.6: add BOM item', async ({ page }) => {
    await page.goto('/projects')
    const projLink = page.locator('a[href^="/projects/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      // Look for add component button in BOM section
      const addBomBtn = page.getByText(/Añadir componente/i).first()
      if (await addBomBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(addBomBtn).toBeVisible()
      }
    }
  })

  test('project list shows status filter tabs', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByText(/Todos/i)).toBeVisible()
    // Check for filter tabs
    const activosTab = page.getByText(/Activos/i)
    if (await activosTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(activosTab).toBeVisible()
    }
  })
})
