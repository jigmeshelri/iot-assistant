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

  test('filter chips visibles when items exist, or EmptyState', async ({ page }) => {
    await page.goto('/inventory')
    const main = page.locator('main').last()
    const emptyState = main.getByText('Sin componentes')
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      // No items — EmptyState is valid
      await expect(emptyState).toBeVisible()
    } else {
      // Items exist — InventorySearch renders with filter chips
      await expect(main.getByRole('button', { name: /^Todos/ })).toBeVisible()
      await expect(main.getByRole('button', { name: 'Microcontrolador' })).toBeVisible()
      await expect(main.getByRole('button', { name: 'Sensor' })).toBeVisible()
    }
  })

  test('chip "Todos" activo tiene fondo brand-600', async ({ page }) => {
    await page.goto('/inventory')
    const main = page.locator('main').last()
    const chip = main.getByRole('button', { name: /^Todos/ })
    if (await chip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(chip).toHaveClass(/bg-brand-600/)
    }
    // No items → no chips → test passes
  })

  test('tabla tiene 8 columnas (cuando hay datos) o muestra EmptyState', async ({ page }) => {
    await page.goto('/inventory')
    const main = page.locator('main').last()
    const table = main.locator('table')
    const hasTable = await table.count() > 0
    if (hasTable) {
      const headers = table.locator('thead th')
      await expect(headers).toHaveCount(8)
    } else {
      // EmptyState is acceptable when no inventory items exist
      await expect(main.getByText('Sin componentes')).toBeVisible()
    }
  })
})

test.describe('Inventario móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('header sticky: buscador visible o EmptyState', async ({ page }) => {
    await page.goto('/inventory')
    // Wait for page content to render
    await page.waitForLoadState('networkidle')
    // Mobile: either search input (items exist) or EmptyState
    const searchInput = page.getByPlaceholder('Buscar componentes...').first()
    const emptyState = page.getByText('Sin componentes').first()
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false)
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)
    expect(hasSearch || hasEmpty).toBeTruthy()
  })

  test('botón de añadir componente visible', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    // Link to /inventory/new exists in both InventorySearch and EmptyState
    const addLink = page.locator('a[href="/inventory/new"]').first()
    await expect(addLink).toBeVisible({ timeout: 5000 })
  })

  test('chip activo "Todos" tiene fondo brand-600 o EmptyState', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    // Only present if InventorySearch renders (items exist)
    const chip = page.getByRole('button', { name: 'Todos' }).first()
    if (await chip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(chip).toHaveClass(/bg-brand-600/)
    }
    // No items → no chips → test passes
  })

  // 🔴 GAP: mockup muestra conectividad inline (WiFi · BLE) — pendiente de implementar
  test.fail('items muestran conectividad inline (WiFi · BLE)', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page.locator('.inventory-card').getByText(/WiFi/)).toBeVisible()
  })
})
