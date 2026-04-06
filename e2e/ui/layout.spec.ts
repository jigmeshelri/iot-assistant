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

  test('bottom nav visible con 3 tabs + botón Más', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav).toBeVisible()
    await expect(nav.locator('a')).toHaveCount(3)
    await expect(nav.getByRole('button', { name: 'Más' })).toBeVisible()
  })

  test('sidebar oculto', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toBeHidden()
  })

  test('tabs visibles: Inicio, Inventario, Proyectos', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav.getByText('Inicio')).toBeVisible()
    await expect(nav.getByText('Inventario')).toBeVisible()
    await expect(nav.getByText('Proyectos')).toBeVisible()
    await expect(nav.getByText('Comunidad')).toBeHidden()
  })

  test('botón Más abre bottom sheet con 6 ítems', async ({ page }) => {
    await page.goto('/')
    const moreBtn = page.getByRole('button', { name: 'Más' })
    await moreBtn.click()
    const sheet = page.locator('#bottom-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('Escanear')).toBeVisible()
    await expect(sheet.getByText('Ubicaciones')).toBeVisible()
    await expect(sheet.getByText('Comunidad')).toBeVisible()
    await expect(sheet.getByText('Tema')).toBeVisible()
    await expect(sheet.getByText('Perfil')).toBeVisible()
    await expect(sheet.getByText('Salir')).toBeVisible()
  })

  test('tap en overlay cierra bottom sheet', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Más' }).click()
    await expect(page.locator('#bottom-sheet')).toBeVisible()
    await page.locator('#sheet-overlay').click()
    await expect(page.locator('#bottom-sheet')).toBeHidden()
  })

  test('navegación desde sheet funciona', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Más' }).click()
    await page.locator('#bottom-sheet').getByText('Ubicaciones').click()
    await expect(page).toHaveURL(/\/locations/)
  })
})

test.describe('Layout tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('bottom nav visible con 6 tabs + botón Más', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav).toBeVisible()
    await expect(nav.locator('a')).toHaveCount(6)
    await expect(nav.getByRole('button', { name: 'Más' })).toBeVisible()
  })

  test('sidebar oculto en tablet', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toBeHidden()
  })

  test('tabs tablet incluyen Escanear, Ubicaciones, Comunidad', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav.getByText('Escanear')).toBeVisible()
    await expect(nav.getByText('Ubicaciones')).toBeVisible()
    await expect(nav.getByText('Comunidad')).toBeVisible()
  })

  test('sheet en tablet solo tiene Tema, Perfil, Salir', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Más' }).click()
    const sheet = page.locator('#bottom-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('Tema')).toBeVisible()
    await expect(sheet.getByText('Perfil')).toBeVisible()
    await expect(sheet.getByText('Salir')).toBeVisible()
    await expect(sheet.getByText('Escanear')).toBeHidden()
  })
})
