import { test, expect } from '../fixtures/auth'

test.describe('Inventario desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('topbar: título + buscador + Filtrar + Añadir', async ({ page }) => {
    await page.goto('/inventory')
    const header = page.locator('header').first()
    await expect(header.getByText('Inventario')).toBeVisible()
    await expect(header.getByText('Buscar componentes...')).toBeVisible()
    await expect(header.getByText('Filtrar')).toBeVisible()
    await expect(header.getByRole('link', { name: /Añadir componente/i })).toBeVisible()
  })

  test('filter chips visibles: Todos, MCU, Sensores, Módulos, Pasivos', async ({ page }) => {
    await page.goto('/inventory')
    const main = page.locator('main').last()
    await expect(main.getByText(/Todos/)).toBeVisible()
    await expect(main.getByText('MCU')).toBeVisible()
    await expect(main.getByText('Sensores')).toBeVisible()
    await expect(main.getByText('Módulos')).toBeVisible()
    await expect(main.getByText('Pasivos')).toBeVisible()
  })

  test('chip "Todos" activo tiene fondo brand-600', async ({ page }) => {
    await page.goto('/inventory')
    const chip = page.locator('main').last().getByText(/Todos/).first()
    const bg = await chip.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)') // brand-600
  })

  test('tabla tiene 8 columnas (cuando hay datos) o muestra EmptyState', async ({ page }) => {
    await page.goto('/inventory')
    const table = page.locator('table')
    const hasTable = await table.count() > 0
    if (hasTable) {
      const headers = page.locator('table thead th')
      await expect(headers).toHaveCount(8)
    } else {
      // EmptyState is acceptable when no inventory items exist
      // Scope to main to avoid the hidden mobile element
      await expect(page.locator('main').last().getByText('Sin componentes')).toBeVisible()
    }
  })
})

test.describe('Inventario móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('header sticky: buscador visible', async ({ page }) => {
    await page.goto('/inventory')
    // The search bar is a styled span, not a real input — filter by visible instance
    const searchSpan = page.getByText('Buscar componentes...').filter({ visible: true }).first()
    await expect(searchSpan).toBeVisible()
  })

  test('botón + de añadir componente navega a /inventory/new', async ({ page }) => {
    await page.goto('/inventory')
    // Buscar el enlace al /inventory/new con fondo brand-600
    const addBtn = page.locator('a[href="/inventory/new"]').first()
    await expect(addBtn).toBeVisible()
    const bg = await addBtn.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)') // brand-600
  })

  test('chip activo "Todos" tiene fondo brand-600', async ({ page }) => {
    await page.goto('/inventory')
    const allChip = page.getByText('Todos').first()
    await expect(allChip).toBeVisible()
    const bg = await allChip.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)')
  })

  // 🔴 GAP: mockup muestra conectividad inline (WiFi · BLE) — pendiente de implementar
  test.fail('items muestran conectividad inline (WiFi · BLE)', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page.locator('.inventory-card').getByText(/WiFi/)).toBeVisible()
  })
})
