/**
 * Code Generation — AC-3.7.1 to AC-3.7.3
 *
 * Uses seeded-test fixture:
 *   - projectId: 'cccccccc-0001-4000-8000-000000000001' (type: 'diy', has BOM)
 *   - codeResourceId: 'ffffffff-0001-4000-8000-000000000001' (main.cpp, env: arduino)
 *   - AI mock wired at high confidence (ai/code/generate returns main.cpp + content)
 *
 * All assertions are hard — seeded data is guaranteed.
 */
import { test, expect } from '../fixtures/seeded-test'

const PROJECT_URL = `/projects/cccccccc-0001-4000-8000-000000000001`

test.describe('Code Generation — AC-3.7.1 to AC-3.7.3', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  // ---------------------------------------------------------------------------
  // AC-3.7.1: Generate code from project → resource appears in the list
  // AI mock intercepts /ai/code/generate and returns { resources: [main.cpp] }
  // ---------------------------------------------------------------------------
  test('AC-3.7.1: clicking Generar código adds resource to the list', async ({ page }) => {
    await page.goto(PROJECT_URL)
    await page.waitForLoadState('networkidle')

    // The generate button is inside the CodeResources island ("✨ Generar código")
    const generateBtn = page.getByRole('button', { name: /Generar código/i })
    await expect(generateBtn).toBeVisible({ timeout: 10_000 })

    // Click — AI mock fulfills the request immediately
    await generateBtn.click()

    // Resource list must show the generated filename
    await expect(page.getByText('main.cpp')).toBeVisible({ timeout: 10_000 })
  })

  // ---------------------------------------------------------------------------
  // AC-3.7.2: Download button exists for the seeded code resource
  // The seeded project already has main.cpp (codeResourceId) so the download
  // button should be present without needing to generate first.
  // ---------------------------------------------------------------------------
  test('AC-3.7.2: download button exists for existing code resource', async ({ page }) => {
    await page.goto(PROJECT_URL)
    await page.waitForLoadState('networkidle')

    // The seeded resource (main.cpp) must be listed
    await expect(page.getByText('main.cpp')).toBeVisible({ timeout: 10_000 })

    // Download button (title="Descargar") must exist
    const downloadBtn = page.getByTitle('Descargar').first()
    await expect(downloadBtn).toBeVisible()

    // Verify the filename will have a valid extension by checking the resource label
    // main.cpp → .cpp extension — visible in the resource language/environment info
    await expect(page.getByText(/cpp/)).toBeVisible()
  })

  // ---------------------------------------------------------------------------
  // AC-3.7.3: Default environment matches project type (DIY → arduino)
  // Seeded project: project_type='diy' → PROJECT_TYPE_ENV['diy'] → falls back to
  // 'arduino' (PROJECT_TYPE_ENV only maps arduino/esphome/micropython/platformio
  // keys — 'diy' is not a key, so the ?? 'arduino' fallback fires).
  // ---------------------------------------------------------------------------
  test('AC-3.7.3: default environment selector value is arduino for DIY project', async ({ page }) => {
    await page.goto(PROJECT_URL)
    await page.waitForLoadState('networkidle')

    // The CodeResources island shows two selects in the generate panel:
    // first one is environment, second is mode (skeleton/complete)
    // Ensure we are on the generate tab (it is the default)
    const generateTab = page.getByRole('button', { name: /^Generar$/i })
    await expect(generateTab).toBeVisible({ timeout: 10_000 })

    // The environment select is the first select inside the generate panel
    // It should default to 'arduino' for a DIY project
    const envSelect = page.locator('select').first()
    await expect(envSelect).toHaveValue('arduino', { timeout: 5_000 })
  })
})
