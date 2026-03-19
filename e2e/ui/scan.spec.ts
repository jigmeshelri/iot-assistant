import { test, expect } from '../fixtures/auth'

test.describe('Página escanear (/inventory/new)', () => {

  test('muestra zona de cámara con texto "Fotografiar componente"', async ({ page }) => {
    await page.goto('/inventory/new')
    await expect(page.getByText('Fotografiar componente')).toBeVisible()
  })

  test('formulario tiene campos SKU, Nombre, Categoría, Cantidad', async ({ page }) => {
    await page.goto('/inventory/new')
    await expect(page.getByPlaceholder('ESP32-001')).toBeVisible()
    await expect(page.getByPlaceholder('ESP32-C6 XIAO')).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })

  test('input de archivo acepta imágenes', async ({ page }) => {
    await page.goto('/inventory/new')
    const input = page.locator('input[type=file]')
    await expect(input).toHaveAttribute('accept', 'image/*')
  })

  // 🔴 GAP: mockup tiene viewfinder con esquinas, línea animada y fondo dark
  test.fail('viewfinder tiene fondo oscuro (bg-slate-900)', async ({ page }) => {
    await page.goto('/inventory/new')
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
