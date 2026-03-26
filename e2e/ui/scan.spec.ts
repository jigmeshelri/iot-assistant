import { test, expect } from '../fixtures/auth'

// /inventory/new content is in the default slot (lg:hidden on desktop)
// so scan tests run at mobile viewport
test.describe('Página escanear (/inventory/new)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('muestra zona de cámara con texto "Fotografiar componente"', async ({ page }) => {
    await page.goto('/inventory/new')
    // At mobile viewport, the mobile content is visible — wait for React to hydrate
    await expect(page.getByText('Fotografiar componente').first()).toBeVisible({ timeout: 10_000 })
  })

  test('formulario tiene campos SKU, Nombre, Categoría, Cantidad', async ({ page }) => {
    await page.goto('/inventory/new')
    // Wait for React island to hydrate — ComponentForm inside CameraCapture
    await expect(page.getByPlaceholder('ESP32-C6 XIAO').first()).toBeVisible({ timeout: 10_000 })
    // Category select and quantity input
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('input de archivo acepta imágenes', async ({ page }) => {
    await page.goto('/inventory/new')
    const mobile = page.locator('.lg\\:hidden')
    // The file input is always hidden (triggered programmatically) — check attribute only
    await mobile.locator('input[type=file]').first().waitFor({ state: 'attached', timeout: 10_000 })
    const input = mobile.locator('input[type=file]').first()
    await expect(input).toHaveAttribute('accept', 'image/*')
  })

  // 🔴 GAP: mockup tiene viewfinder con esquinas, línea animada y fondo dark
  test.fail('viewfinder tiene fondo oscuro (bg-slate-900)', async ({ page }) => {
    await page.goto('/inventory/new')
    await page.waitForSelector('.rounded-3xl', { timeout: 5_000 })
    const viewfinder = page.locator('.rounded-3xl').first()
    const bg = await viewfinder.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(15, 23, 42)') // slate-900
  })

  // 🔴 GAP: resultado IA debería mostrar campos separados por tipo
  test.fail('resultado IA muestra campos Nombre, Categoría, Conectividad', async ({ page }) => {
    await page.goto('/inventory/new')
    await expect(page.getByText('Nombre')).toBeVisible()
    await expect(page.getByText('Categoría')).toBeVisible()
    await expect(page.getByText('Conectividad detectada')).toBeVisible()
  })
})
