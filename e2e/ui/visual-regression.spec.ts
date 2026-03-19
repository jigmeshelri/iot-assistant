import { test, expect } from '../fixtures/auth'

// Generar baselines: npx playwright test visual-regression --update-snapshots
// En CI compara contra baselines guardadas en e2e/snapshots/

test.describe('Visual regression', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('dashboard desktop', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    })
  })

  test('inventario desktop', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('inventory-desktop.png')
  })

  test('proyectos desktop', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('projects-desktop.png')
  })

  test('sidebar — estado activo por página', async ({ page }) => {
    for (const [path, label] of [
      ['/', 'dashboard'],
      ['/inventory', 'inventario'],
      ['/projects', 'proyectos'],
    ] as const) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const sidebar = page.locator('aside')
      await expect(sidebar).toHaveScreenshot(`sidebar-active-${label}.png`)
    }
  })
})

test.describe('Visual regression móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('dashboard móvil', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('dashboard-mobile.png')
  })

  test('inventario móvil', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('inventory-mobile.png')
  })
})
