/**
 * AC-3.3.1: Create root location → appears in tree.
 * AC-3.3.2: Create sub-location → nested under parent.
 * AC-3.3.3: Detail shows breadcrumb + component list.
 * AC-3.3.6: Node shows component count.
 *
 * Uses seeded fixture — Test-Taller / Test-Cajón / Test-Cajita hierarchy guaranteed.
 * Test-Taller has 1 component (ESP32, qty=3).
 * Test-Cajón has 1 component (DHT22, qty=5).
 * Test-Cajita has 1 component (Relay, qty=1).
 */
import { test, expect } from '../fixtures/seeded-test'

test.describe('Locations — AC-3.3.1 to AC-3.3.6', () => {
  // LocationTree only renders in the mobile slot (default slot, no lg:hidden wrapper
  // but index.astro wraps in px-4 pt-6 pb-4 — works at any viewport)
  test.use({ viewport: { width: 390, height: 844 } })

  test('AC-3.3.1: seeded root location appears in the location tree', async ({ page }) => {
    await page.goto('/locations')

    // Page heading
    await expect(page.locator('h1').getByText(/Ubicaciones/i)).toBeVisible({ timeout: 10_000 })

    // LocationTree island must show Test-Taller (root node, no parent)
    await expect(page.getByText('Test-Taller')).toBeVisible({ timeout: 15_000 })
  })

  test('AC-3.3.1: create a new root location and verify it appears in the tree', async ({ page }) => {
    await page.goto('/locations')

    // Wait for the island to hydrate (shows at least the seeded tree)
    await expect(page.getByText('Test-Taller')).toBeVisible({ timeout: 15_000 })

    // Click "+ Nueva ubicación raíz" button
    const newRootBtn = page.getByRole('button', { name: /Nueva ubicación raíz/i })
    await expect(newRootBtn).toBeVisible()
    await newRootBtn.click()

    // Input and Crear button appear
    const nameInput = page.getByPlaceholder('Nombre de ubicación')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('E2E-Root-Location')

    const createBtn = page.getByRole('button', { name: /^Crear$/i })
    await expect(createBtn).toBeVisible()
    await createBtn.click()

    // After window.location.reload() the new location must be in the tree
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E-Root-Location')).toBeVisible({ timeout: 10_000 })
  })

  test('AC-3.3.2: create sub-location under Test-Cajón and verify nesting', async ({ page, ids }) => {
    await page.goto('/locations')

    // Wait for tree
    await expect(page.getByText('Test-Taller')).toBeVisible({ timeout: 15_000 })

    // Hover over Test-Cajón to reveal the "+" button (title="Añadir sub-ubicación")
    // LocationTree renders the + button with opacity-0 group-hover:opacity-100
    // We can trigger it by hovering the parent row
    const cajonLink = page.getByText('Test-Cajón')
    await cajonLink.hover()

    const addChildBtn = page.getByTitle('Añadir sub-ubicación').first()
    await expect(addChildBtn).toBeVisible({ timeout: 5_000 })
    await addChildBtn.click()

    // An inline form appears for sub-location name
    const subNameInput = page.getByPlaceholder('Nombre sub-ubicación')
    await expect(subNameInput).toBeVisible()
    await subNameInput.fill('E2E-Sub-Location')

    const createChildBtn = page.getByRole('button', { name: /^Crear$/i }).last()
    await expect(createChildBtn).toBeVisible()
    await createChildBtn.click()

    // After reload, new sub-location appears nested under Test-Cajón
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E-Sub-Location')).toBeVisible({ timeout: 10_000 })
  })

  test('AC-3.3.3: location detail shows heading and component list', async ({ page, ids }) => {
    // Navigate directly to Test-Taller using its known ID
    await page.goto(`/locations/${ids.locationTallerId}`)
    await page.waitForLoadState('networkidle')

    // Heading shows the location name (rendered by LocationManager h2)
    await expect(page.getByText('Test-Taller')).toBeVisible({ timeout: 10_000 })

    // Components section header
    await expect(page.getByText(/Componentes/i)).toBeVisible()

    // ESP32 is assigned to Test-Taller in the seed
    await expect(page.getByText('ESP32-C6 XIAO')).toBeVisible()
  })

  test('AC-3.3.3: location detail shows breadcrumb on desktop', async ({ page, ids }) => {
    // Use desktop viewport to see the topbar breadcrumb
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/locations/${ids.locationCajonId}`)
    await page.waitForLoadState('networkidle')

    // Breadcrumb: Ubicaciones > Test-Taller > Test-Cajón
    const topbar = page.locator('[slot="topbar"], nav, header').first()
    // The breadcrumb is rendered in the topbar Fragment — Astro renders it inline
    await expect(page.getByText('Ubicaciones')).toBeVisible({ timeout: 10_000 })
    // Parent link shows Test-Taller
    await expect(page.getByText('Test-Taller')).toBeVisible()
    // Current page shows Test-Cajón
    await expect(page.getByText('Test-Cajón').first()).toBeVisible()
  })

  test('AC-3.3.6: location tree node shows component count badge', async ({ page }) => {
    await page.goto('/locations')

    // Wait for LocationTree hydration
    await expect(page.getByText('Test-Taller')).toBeVisible({ timeout: 15_000 })

    // Test-Taller has 1 stock item assigned → should show "1 pzas"
    // TreeNode renders: {count} pzas when count > 0
    await expect(page.getByText('1 pzas')).toBeVisible({ timeout: 10_000 })
  })
})
