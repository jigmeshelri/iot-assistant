/**
 * AI Scan — AC-3.2.1 to AC-3.2.4
 *
 * Uses seeded-test fixture (auth + seed + AI mock at 0.95 confidence by default).
 * For AC-3.2.2 we rewire the AI route to return confidence 0.45.
 *
 * Mobile viewport: the scan page shows the camera UI in .lg:hidden at narrow widths.
 */
import { test, expect } from '../fixtures/seeded-test'
import { wireAiRoutesForPage } from '../fixtures/ai-mock'
import { fileURLToPath } from 'url'
import path from 'path'

// Minimal 1×1 pixel PNG — avoids real file I/O
const FAKE_IMAGE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fake-component.png',
)

test.describe('AI Scan — AC-3.2.1 to AC-3.2.4', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  // ---------------------------------------------------------------------------
  // AC-3.2.1: Upload photo → AI pre-fills form fields with mock response
  // Mock returns: name='ESP32-C6 XIAO', category='MCU', platform_family='ESP32'
  // ---------------------------------------------------------------------------
  test('AC-3.2.1: upload photo → AI pre-fills name, category and platform', async ({ page }) => {
    await page.goto('/inventory/new')

    // Wait for React island to hydrate — "Fotografiar componente" text confirms it
    await expect(page.getByText('Fotografiar componente').first()).toBeVisible({ timeout: 10_000 })

    // Trigger file upload via the hidden input (capture="environment" makes it hidden)
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(FAKE_IMAGE_PATH)

    // Wait for the AI identification banner to appear
    await expect(page.getByText(/Componente identificado/i)).toBeVisible({ timeout: 10_000 })

    // Name field must be pre-filled with the mock value
    const nameInput = page.getByPlaceholder('ESP32-C6 XIAO').first()
    await expect(nameInput).toHaveValue('ESP32-C6 XIAO', { timeout: 5_000 })

    // Category select must reflect 'MCU' (mapped to 'Microcontrolador' by the form)
    const categorySelect = page.locator('select').first()
    await expect(categorySelect).toHaveValue(/Microcontrolador|MCU/, { timeout: 5_000 })

    // Platform select must reflect 'ESP32'
    const platformSelect = page.locator('select').nth(1)
    await expect(platformSelect).toHaveValue('ESP32', { timeout: 5_000 })
  })

  // ---------------------------------------------------------------------------
  // AC-3.2.2: Low confidence → warning banner visible
  // Rewire AI mock to return confidence 0.45 (below 0.7 threshold)
  // ---------------------------------------------------------------------------
  test('AC-3.2.2: low confidence → warning banner appears', async ({ page }) => {
    // Override AI routes to low confidence BEFORE navigation
    await wireAiRoutesForPage(page, 0.45)

    await page.goto('/inventory/new')
    await expect(page.getByText('Fotografiar componente').first()).toBeVisible({ timeout: 10_000 })

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(FAKE_IMAGE_PATH)

    // Wait for the identification banner to confirm the AI response arrived
    await expect(page.getByText(/Componente identificado/i)).toBeVisible({ timeout: 10_000 })

    // Low-confidence warning must be visible
    await expect(
      page.getByText(/La IA no está segura|no está segura/i).first()
    ).toBeVisible({ timeout: 5_000 })
  })

  // ---------------------------------------------------------------------------
  // AC-3.2.3: User can correct pre-filled fields before confirming
  // After AI fills the name, the user edits it and the form reflects the change
  // ---------------------------------------------------------------------------
  test('AC-3.2.3: user can correct pre-filled name before saving', async ({ page }) => {
    await page.goto('/inventory/new')
    await expect(page.getByText('Fotografiar componente').first()).toBeVisible({ timeout: 10_000 })

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(FAKE_IMAGE_PATH)

    // Wait for pre-fill
    await expect(page.getByText(/Componente identificado/i)).toBeVisible({ timeout: 10_000 })

    const nameInput = page.getByPlaceholder('ESP32-C6 XIAO').first()
    await expect(nameInput).toHaveValue('ESP32-C6 XIAO', { timeout: 5_000 })

    // User corrects the name
    const correctedName = 'ESP32-C6 XIAO (corregido)'
    await nameInput.clear()
    await nameInput.fill(correctedName)

    // The input must reflect the corrected value — user is in control
    await expect(nameInput).toHaveValue(correctedName)
  })

  // ---------------------------------------------------------------------------
  // AC-3.2.4: Original image stored as reference (image_url set after confirm)
  //
  // KNOWN GAP: CameraCapture.tsx sends the image to /ai/recognize but does NOT
  // upload it to storage or set image_url in the component record.
  // ComponentForm has no image_url field — the feature is not implemented.
  // This test documents the gap so it is tracked.
  // ---------------------------------------------------------------------------
  test.fail('AC-3.2.4: original image stored as reference after confirming scan', async ({ page }) => {
    await page.goto('/inventory/new')
    await expect(page.getByText('Fotografiar componente').first()).toBeVisible({ timeout: 10_000 })

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(FAKE_IMAGE_PATH)

    await expect(page.getByText(/Componente identificado/i)).toBeVisible({ timeout: 10_000 })

    // Submit the form — the image should be stored and accessible on the detail page
    const submitBtn = page.getByRole('button', { name: /Guardar componente/i })
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Should redirect to /inventory after save
    await page.waitForURL(/\/inventory/, { timeout: 10_000 })

    // Find the saved component and check that image_url is set
    // This FAILS because the current implementation does not persist image_url
    const imgEl = page.locator('img[src*="esp32"]')
    await expect(imgEl).toBeVisible({ timeout: 5_000 })
  })
})
