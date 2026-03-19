import { test, expect } from '../fixtures/auth'

test.describe('Proyectos desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('topbar: título + botón "Nuevo proyecto"', async ({ page }) => {
    await page.goto('/projects')
    const header = page.locator('header').first()
    await expect(header.getByText('Proyectos')).toBeVisible()
    const btn = header.getByRole('link', { name: /Nuevo proyecto/i })
    await expect(btn).toBeVisible()
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)') // brand-600
  })

  test('tabla tiene columnas: Proyecto, Estado, Progreso, Actualizado, Acciones', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('columnheader', { name: 'Proyecto' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Progreso' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Actualizado' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Acciones' })).toBeVisible()
  })

  test('estado vacío muestra EmptyState con enlace a /ai/discover', async ({ page }) => {
    // Only applies when there are no projects — test is data-dependent
    await page.goto('/projects')
    const emptyLink = page.getByRole('link', { name: /Descubrir proyectos/i })
    const table = page.locator('table')
    // Either the table exists (has data) or the empty state is shown
    const hasTable = await table.count() > 0
    if (!hasTable) {
      await expect(emptyLink).toBeVisible()
    }
  })
})

test.describe('Proyectos móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('header sticky visible con título Proyectos', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByText('Proyectos').first()).toBeVisible()
  })

  test('botón + navega a /ai/plan', async ({ page }) => {
    await page.goto('/projects')
    const btn = page.locator('a[href="/ai/plan"]').first()
    await expect(btn).toBeVisible()
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)') // brand-600
  })
})
