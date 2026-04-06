/**
 * AC-3.1.2: Search by name/SKU filters in real time — non-matching items disappear.
 * AC-3.1.6: Category chip filters — only items of that category remain visible.
 *
 * Uses seeded fixture — seed guarantees 6 components across multiple categories.
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Inventory Search — AC-3.1.2, AC-3.1.6', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('AC-3.1.2: search by name filters results in real time', async ({ page }) => {
    await page.goto('/inventory')

    // Wait for the React island to hydrate
    const esp32 = page.getByText('ESP32-C6 XIAO')
    await expect(esp32).toBeVisible({ timeout: 15_000 })

    // Type a search query that only matches ESP32
    const searchInput = page.getByPlaceholder('Buscar componentes...')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('ESP32')

    // ESP32 must remain visible
    await expect(page.getByText('ESP32-C6 XIAO')).toBeVisible()

    // Non-matching items must disappear
    await expect(page.getByText('DHT22')).not.toBeVisible()
    await expect(page.getByText('Servo SG90')).not.toBeVisible()
    await expect(page.getByText('TP4056')).not.toBeVisible()
  })

  test('AC-3.1.2: search by SKU filters results in real time', async ({ page }) => {
    await page.goto('/inventory')

    const dht22 = page.getByText('DHT22')
    await expect(dht22).toBeVisible({ timeout: 15_000 })

    // Search by SKU — TEST-SNS-001 belongs to DHT22
    const searchInput = page.getByPlaceholder('Buscar componentes...')
    await searchInput.fill('TEST-SNS-001')

    await expect(page.getByText('DHT22')).toBeVisible()
    // Other components must not be visible
    await expect(page.getByText('ESP32-C6 XIAO')).not.toBeVisible()
    await expect(page.getByText('Servo SG90')).not.toBeVisible()
  })

  test('AC-3.1.2: clearing search restores full list', async ({ page }) => {
    await page.goto('/inventory')

    const esp32 = page.getByText('ESP32-C6 XIAO')
    await expect(esp32).toBeVisible({ timeout: 15_000 })

    const searchInput = page.getByPlaceholder('Buscar componentes...')
    await searchInput.fill('ESP32')
    await expect(page.getByText('DHT22')).not.toBeVisible()

    // Clear — all components must return
    await searchInput.clear()
    await expect(page.getByText('ESP32-C6 XIAO')).toBeVisible()
    await expect(page.getByText('DHT22')).toBeVisible()
    await expect(page.getByText('Servo SG90')).toBeVisible()
  })

  test('AC-3.1.6: category chip "Sensor" shows only sensor components', async ({ page }) => {
    await page.goto('/inventory')

    // Wait for island hydration
    const esp32 = page.getByText('ESP32-C6 XIAO')
    await expect(esp32).toBeVisible({ timeout: 15_000 })

    // Click the "Sensor" category chip
    const sensorChip = page.getByRole('button', { name: 'Sensor' })
    await expect(sensorChip).toBeVisible()
    await sensorChip.click()

    // DHT22 is category "Sensor" — must remain visible
    await expect(page.getByText('DHT22')).toBeVisible()

    // Other categories must not be visible
    await expect(page.getByText('ESP32-C6 XIAO')).not.toBeVisible()   // MCU
    await expect(page.getByText('Servo SG90')).not.toBeVisible()       // Actuador
    await expect(page.getByText('TP4056')).not.toBeVisible()           // Alimentación
    await expect(page.getByText('Relay Module 5V')).not.toBeVisible()  // Módulo
  })

  test('AC-3.1.6: clicking "Todos" restores full list after category filter', async ({ page }) => {
    await page.goto('/inventory')

    const esp32 = page.getByText('ESP32-C6 XIAO')
    await expect(esp32).toBeVisible({ timeout: 15_000 })

    // Filter by Sensor
    await page.getByRole('button', { name: 'Sensor' }).click()
    await expect(page.getByText('ESP32-C6 XIAO')).not.toBeVisible()

    // Click Todos to reset
    await page.getByRole('button', { name: 'Todos' }).click()
    await expect(page.getByText('ESP32-C6 XIAO')).toBeVisible()
    await expect(page.getByText('DHT22')).toBeVisible()
  })
})
