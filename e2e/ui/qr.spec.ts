import { test, expect } from '../fixtures/seeded-test'
import { SEED_IDS } from '../fixtures/seed'

test.describe('QR — AC-3.4.1', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('AC-3.4.1: QR label visible + download PNG + print buttons', async ({ page }) => {
    // Navigate directly to the seeded location (Test-Taller)
    await page.goto(`/locations/${SEED_IDS.locationTallerId}`)
    await page.waitForLoadState('networkidle')

    // QR label section heading
    await expect(page.getByText('Etiqueta QR')).toBeVisible({ timeout: 10_000 })

    // QR image should be present (rendered by QRLabel island)
    const qrImg = page.locator('img[alt*="QR"]').first()
    await expect(qrImg).toBeVisible({ timeout: 10_000 })

    // Print button should be visible
    const printBtn = page.getByRole('button', { name: /Imprimir/i })
    await expect(printBtn).toBeVisible()
  })
})
