import { test, expect } from '../fixtures/auth'

test.describe('Dashboard desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('topbar muestra saludo y botón "Escanear componente"', async ({ page }) => {
    await page.goto('/')
    const header = page.locator('header').first()
    // Greeting includes "Buenos días", "Buenas tardes" or "Buenas noches"
    await expect(header.getByText(/Buenos (días|tardes|noches)/)).toBeVisible()
    const cta = header.getByRole('link', { name: /Escanear componente/i })
    await expect(cta).toBeVisible()
    const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(13, 148, 136)') // brand-600
  })

  test('muestra 4 tarjetas de estadísticas', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Componentes totales')).toBeVisible()
    await expect(page.getByText('Ubicaciones activas')).toBeVisible()
    await expect(page.getByText('Proyectos activos')).toBeVisible()
    await expect(page.getByText('Escaneos esta semana')).toBeVisible()
  })

  test('sección proyectos activos tiene columnas correctas', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('columnheader', { name: 'Proyecto' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Progreso' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Actualizado' })).toBeVisible()
  })

  test('sección "Añadidas recientemente" está presente', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Añadidas recientemente')).toBeVisible()
  })
})

test.describe('Dashboard móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('muestra 3 tarjetas de estadísticas', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Piezas')).toBeVisible()
    await expect(page.getByText('Ubicaciones')).toBeVisible()
    await expect(page.getByText('Proyectos')).toBeVisible()
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
