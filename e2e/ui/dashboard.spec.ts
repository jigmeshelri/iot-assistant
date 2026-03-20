import { test, expect } from '../fixtures/auth'

test.describe('Dashboard desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('topbar muestra saludo y botón "Escanear componente"', async ({ page }) => {
    await page.goto('/')
    const header = page.locator('header').first()
    await expect(header.getByText(/Buenos (días|tardes|noches)/)).toBeVisible()
    const cta = header.getByRole('link', { name: /Escanear componente/i })
    await expect(cta).toBeVisible()
    const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)') // brand-600
  })

  test('muestra 4 tarjetas de estadísticas', async ({ page }) => {
    await page.goto('/')
    // Scope to desktop-main to avoid picking up hidden mobile elements
    const main = page.locator('main').last()
    await expect(main.getByText('Componentes totales')).toBeVisible()
    await expect(main.getByText('Ubicaciones activas')).toBeVisible()
    await expect(main.getByText('Proyectos activos').first()).toBeVisible()
    await expect(main.getByText('Escaneos esta semana')).toBeVisible()
  })

  test('sección "Proyectos activos" tiene tabla o empty state', async ({ page }) => {
    await page.goto('/')
    const main = page.locator('main').last()
    await expect(main.getByText('Proyectos activos').first()).toBeVisible()
    // Either a table or an empty state is shown
    const hasTable = await main.locator('table').count() > 0
    const hasEmpty = await main.getByText('Sin proyectos activos').count() > 0
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('sección "Añadidas recientemente" está presente', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Añadidas recientemente')).toBeVisible()
  })
})

test.describe('Dashboard móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('muestra tarjetas Piezas, Ubicaciones, Proyectos', async ({ page }) => {
    await page.goto('/')
    // Scope to mobile section (lg:hidden)
    const mobile = page.locator('.lg\\:hidden').first()
    await expect(mobile.getByText('Piezas')).toBeVisible()
    await expect(mobile.getByText('Ubicaciones')).toBeVisible()
    await expect(mobile.getByText('Proyectos').first()).toBeVisible()
  })

  test('4ª tarjeta "Escaneos esta semana" no aparece en móvil', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Escaneos esta semana')).toBeHidden()
  })

  test('botón "Escanear componente" visible y full-width', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /Escanear componente/i })
    await expect(cta).toBeVisible()
    const box = await cta.boundingBox()
    expect(box!.width).toBeGreaterThan(300)
  })
})
