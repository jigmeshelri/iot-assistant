import { test, expect } from '../fixtures/seeded-test'
import { SEED_IDS } from '../fixtures/seed'

/**
 * Seeded state:
 *  - BOM: ESP32-C6 XIAO (qty_req=1, stock=3) → available
 *  - BOM: DHT22         (qty_req=2, stock=5) → available
 *  - Stock: Resistor 10kΩ qty=0              → would show "Falta" if added to BOM
 */
test.describe('Stock Consumption — AC-3.6.9 to AC-3.6.11', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  // ── AC-3.6.9: Use component → stock decremented ──
  test('AC-3.6.9: use component decrements stock and shows Usado', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // Consumption section heading
    await expect(page.getByText('Consumo de Stock')).toBeVisible({ timeout: 10_000 })

    // ESP32-C6 XIAO is available (stock=3, required=1) — should have a "Usar" button
    const esp32Row = page.locator('div').filter({ hasText: 'ESP32-C6 XIAO' }).filter({ hasText: /×1 requerido/ }).first()
    await expect(esp32Row).toBeVisible({ timeout: 10_000 })

    const usarBtn = esp32Row.getByRole('button', { name: /^Usar$/ })
    await expect(usarBtn).toBeVisible()
    await usarBtn.click()

    // After consuming, page reloads — wait for navigation
    await page.waitForLoadState('networkidle')

    // ESP32-C6 XIAO row should now show "Usado" badge
    const esp32RowAfter = page.locator('div').filter({ hasText: 'ESP32-C6 XIAO' }).filter({ hasText: /×1 requerido/ }).first()
    await expect(esp32RowAfter.getByText('Usado')).toBeVisible({ timeout: 10_000 })
  })

  // ── AC-3.6.10: No stock → "Falta" badge + button disabled ──
  test('AC-3.6.10: component with no stock shows Falta badge', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    // First add "Resistor 10kΩ" (stock=0) to the BOM so it shows up in consumption
    const addBomBtn = page.getByRole('button', { name: /Añadir componente/i })
    await expect(addBomBtn).toBeVisible({ timeout: 10_000 })
    await addBomBtn.click()

    const nameInput = page.getByPlaceholder('Nombre del componente')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Resistor 10kΩ')

    await page.getByRole('button', { name: 'Guardar' }).first().click()

    // Wait for BOM to update
    await expect(page.getByText('Resistor 10kΩ').first()).toBeVisible({ timeout: 10_000 })

    // In StockConsumption: Resistor 10kΩ has stock=0 → shows "Falta"
    const resistorRow = page.locator('div').filter({ hasText: 'Resistor 10kΩ' }).filter({ hasText: /requerido/ }).first()
    await expect(resistorRow).toBeVisible({ timeout: 5_000 })
    await expect(resistorRow.getByText('Falta')).toBeVisible({ timeout: 5_000 })
  })

  // ── AC-3.6.11: Undo consumption → stock restored ──
  test('AC-3.6.11: undo consumption restores stock and re-enables Usar', async ({ page }) => {
    await page.goto(`/projects/${SEED_IDS.projectId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Consumo de Stock')).toBeVisible({ timeout: 10_000 })

    // DHT22 is available — consume it first
    const dht22Row = page.locator('div').filter({ hasText: 'DHT22' }).filter({ hasText: /×2 requerido/ }).first()
    await expect(dht22Row).toBeVisible({ timeout: 10_000 })

    const usarBtn = dht22Row.getByRole('button', { name: /^Usar$/ })
    await expect(usarBtn).toBeVisible()
    await usarBtn.click()

    // Wait for page reload after consumption
    await page.waitForLoadState('networkidle')

    // DHT22 row should show "Usado" + "Deshacer" button
    const dht22After = page.locator('div').filter({ hasText: 'DHT22' }).filter({ hasText: /×2 requerido/ }).first()
    await expect(dht22After.getByText('Usado')).toBeVisible({ timeout: 10_000 })

    const undoBtn = dht22After.getByRole('button', { name: /Deshacer/i })
    await expect(undoBtn).toBeVisible()
    await undoBtn.click()

    // Wait for page reload after undo
    await page.waitForLoadState('networkidle')

    // DHT22 should show "Usar" button again (stock restored)
    const dht22Restored = page.locator('div').filter({ hasText: 'DHT22' }).filter({ hasText: /×2 requerido/ }).first()
    await expect(dht22Restored.getByRole('button', { name: /^Usar$/ })).toBeVisible({ timeout: 10_000 })
  })
})
