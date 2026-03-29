import { test, expect } from '../fixtures/auth'

test.describe('Layout desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('sidebar visible, bottom nav oculto', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toBeVisible()
    await expect(page.locator('nav.fixed')).toBeHidden()
  })

  test('sidebar tiene fondo slate-900 (#0f172a)', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    // Wait for CSS to apply before evaluating computed style
    await page.waitForLoadState('networkidle')
    const bg = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor)
    // Tailwind v4 uses oklch for built-in palette colors
    expect(bg).toBe('oklch(0.208 0.042 265.755)')
  })

  test('sidebar muestra texto "IoT Assistant"', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside').getByText('IoT Assistant')).toBeVisible()
  })

  test('nav activo en /inventory tiene fondo brand-600', async ({ page }) => {
    await page.goto('/inventory')
    const link = page.locator('aside a[href="/inventory"]')
    await expect(link).toBeVisible()
    const bg = await link.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)')
  })

  test('nav activo en /projects tiene fondo brand-600', async ({ page }) => {
    await page.goto('/projects')
    const link = page.locator('aside a[href="/projects"]')
    await expect(link).toBeVisible()
    const bg = await link.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)')
  })

  test('menú usuario abre dropdown con "Cerrar sesión"', async ({ page }) => {
    await page.goto('/')
    const menuBtn = page.locator('#user-menu-btn')
    await expect(menuBtn).toBeVisible()
    await menuBtn.click()
    await expect(page.locator('#user-menu-dropdown')).toBeVisible()
    await expect(page.locator('#user-menu-dropdown').getByText('Cerrar sesión')).toBeVisible()
  })

  test('topbar tiene 56px de altura', async ({ page }) => {
    await page.goto('/')
    const header = page.locator('header').first()
    const box = await header.boundingBox()
    expect(box!.height).toBeCloseTo(56, 0)
  })
})

test.describe('Layout móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('bottom nav visible con 5 tabs', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav).toBeVisible()
    await expect(nav.locator('a')).toHaveCount(5)
  })

  test('sidebar oculto', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toBeHidden()
  })

  test('tabs: Inicio, Inventario, Proyectos, Comunidad', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav.getByText('Inicio')).toBeVisible()
    await expect(nav.getByText('Inventario')).toBeVisible()
    await expect(nav.getByText('Proyectos')).toBeVisible()
    await expect(nav.getByText('Comunidad')).toBeVisible()
  })
})

test.describe('Navegación Ubicaciones — AC-6.1 (móvil)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('AC-6.1.1: bottom nav muestra link "Ubicaciones"', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav.getByText('Ubicaciones')).toBeVisible()
  })

  test('AC-6.1.2: click en "Ubicaciones" navega a /locations', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await nav.getByText('Ubicaciones').click()
    await expect(page).toHaveURL(/\/locations/)
  })

  test('AC-6.1.3: link activo en /locations', async ({ page }) => {
    await page.goto('/locations')
    const nav = page.locator('nav.fixed')
    const link = nav.locator('a[href="/locations"]')
    await expect(link).toBeVisible()
    const color = await link.evaluate((el) => getComputedStyle(el).color)
    // brand-600 (teal-600) active color
    expect(color).toBe('rgb(13, 148, 136)')
  })
})

test.describe('Navegación Ubicaciones — AC-6.2 (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('AC-6.2.1: sidebar muestra "Ubicaciones"', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside').getByText('Ubicaciones')).toBeVisible()
  })

  test('AC-6.2.2: click en "Ubicaciones" navega a /locations', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside a[href="/locations"]').click()
    await expect(page).toHaveURL(/\/locations/)
  })

  test('AC-6.2.3: link activo en /locations con fondo brand-600', async ({ page }) => {
    await page.goto('/locations')
    const link = page.locator('aside a[href="/locations"]')
    await expect(link).toBeVisible()
    const bg = await link.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)')
  })
})
