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

  test('tabla tiene columnas correctas (cuando hay datos) o muestra EmptyState', async ({ page }) => {
    await page.goto('/projects')
    const table = page.locator('table')
    const hasTable = await table.count() > 0
    if (hasTable) {
      await expect(page.locator('th').getByText('Proyecto')).toBeVisible()
      await expect(page.locator('th').getByText('Estado')).toBeVisible()
      await expect(page.locator('th').getByText('Progreso')).toBeVisible()
      await expect(page.locator('th').getByText('Actualizado')).toBeVisible()
      await expect(page.locator('th').getByText('Acciones')).toBeVisible()
    } else {
      await expect(page.getByRole('link', { name: /Descubrir proyectos/i })).toBeVisible()
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
