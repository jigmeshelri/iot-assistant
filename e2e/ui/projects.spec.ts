import { test, expect } from '../fixtures/auth'

test.describe('Proyectos desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('topbar: título + botón "Nuevo proyecto"', async ({ page }) => {
    await page.goto('/projects')
    // The desktop topbar (inside header) has title and "Nuevo proyecto" link
    const header = page.locator('header').first()
    await expect(header.locator('h2').getByText('Proyectos')).toBeVisible()
    const btn = header.getByRole('link', { name: /Nuevo proyecto/i })
    await expect(btn).toBeVisible()
  })

  test('muestra datos o EmptyState', async ({ page }) => {
    await page.goto('/projects')
    const main = page.locator('main').last()
    await page.waitForLoadState('networkidle')
    // Either ProjectFilters with data, or EmptyState
    const emptyState = main.getByText(/Sin proyectos/i)
    const filterBtn = main.getByRole('button', { name: /Todos/i })
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)
    const hasFilter = await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)
    expect(hasEmpty || hasFilter).toBeTruthy()
  })
})

test.describe('Proyectos móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('header sticky visible con título Proyectos', async ({ page }) => {
    await page.goto('/projects')
    // Mobile area has the title in h2
    const mobileArea = page.locator('div.lg\\:hidden')
    await expect(mobileArea.locator('h2').getByText('Proyectos')).toBeVisible()
  })

  test('botón + o EmptyState visible', async ({ page }) => {
    await page.goto('/projects')
    const mobileArea = page.locator('div.lg\\:hidden')
    // + button only shows when projects exist; otherwise EmptyState
    const addBtn = mobileArea.locator('a[href="/projects/new"]')
    const emptyState = mobileArea.getByText(/Sin proyectos/i)
    const hasBtn = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)
    expect(hasBtn || hasEmpty).toBeTruthy()
  })
})
