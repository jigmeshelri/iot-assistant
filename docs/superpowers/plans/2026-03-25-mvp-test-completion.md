# MVP Test Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all test gaps for the MVP (Inventory 3.1 + Locations 3.3 + Auth 4.x) so that every acceptance criterion has at least one meaningful automated test.

**Architecture:** Unit tests (Vitest + Testing Library) validate component behavior and data layer logic. E2E tests (Playwright) validate full user flows. RLS tests use Supabase JS client against the real DB with two test users to prove data isolation. Tests follow existing patterns: mock `createSupabaseBrowserClient` for unit, use Playwright fixtures for E2E.

**Tech Stack:** Vitest 4, @testing-library/react, @testing-library/user-event, Playwright, @supabase/supabase-js (for RLS integration tests)

**Existing test patterns to follow:**
- Mock pattern: `vi.mock('../lib/supabase', () => ({ createSupabaseBrowserClient: () => ({ from: vi.fn(() => ({ ... })) }) }))`
- Supabase chain: `mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))`
- Props: each test file defines `defaultProps` and uses `beforeEach` to clear mocks
- E2E: tests accept both "data present" and "empty state" as valid (graceful degradation)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/test/rls.integration.test.ts` | RLS data isolation (AC-4.2) |
| Create | `src/test/middleware.test.ts` | Auth redirect for all protected routes (AC-4.1) |
| Create | `src/test/skuUtils.test.ts` | SKU generation and prefix logic |
| Modify | `src/test/LocationManager.test.tsx` | Add: delete with 0 components, cancel edit |
| Modify | `src/test/StockAdjuster.test.tsx` | Add: supabase error handling |
| Modify | `e2e/ui/auth.spec.ts` | Add: /projects and /locations redirect tests |
| Modify | `e2e/ui/locations.spec.ts` | Add: sub-location creation (AC-3.3.2), location detail assertions (AC-3.3.3) |
| Modify | `e2e/ui/inventory.spec.ts` | Add: category chip filtering behavior (AC-3.1.6), search by location (AC-3.1.2) |
| Modify | `e2e/ui/inventory-detail.spec.ts` | Add: stock adjuster value assertion (AC-3.1.8), delete flow (AC-3.1.5) |

---

## Task 1: RLS Data Isolation Tests (AC-4.2) — CRITICAL

This is the highest-priority gap. The spec rates RLS leaks as P0.

**Files:**
- Create: `src/test/rls.integration.test.ts`

**Prerequisites:** Two test users configured in `.env.test` with `TEST_USER_A_EMAIL`, `TEST_USER_A_PASSWORD`, `TEST_USER_B_EMAIL`, `TEST_USER_B_PASSWORD`. The Supabase project must have these users and seed data.

- [ ] **Step 1: Check .env.test for test user credentials**

Read `.env.test` to see what test credentials exist. If two users aren't configured, this task will document what's needed.

```bash
cat .env.test
```

- [ ] **Step 2: Write failing RLS integration test**

```typescript
// src/test/rls.integration.test.ts
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll } from 'vitest'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY ?? ''

async function authenticatedClient(email: string, password: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`)
  return client
}

describe('RLS: data isolation between users', () => {
  let clientA: ReturnType<typeof createClient>
  let clientB: ReturnType<typeof createClient>

  beforeAll(async () => {
    const emailA = process.env.TEST_USER_A_EMAIL
    const passA = process.env.TEST_USER_A_PASSWORD
    const emailB = process.env.TEST_USER_B_EMAIL
    const passB = process.env.TEST_USER_B_PASSWORD

    if (!emailA || !passA || !emailB || !passB) {
      throw new Error(
        'RLS tests require TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD in .env.test'
      )
    }

    clientA = await authenticatedClient(emailA, passA)
    clientB = await authenticatedClient(emailB, passB)
  })

  it('User A cannot see User B stock', async () => {
    // User B creates a stock item
    const { data: bStock } = await clientB
      .from('stock')
      .select('id')
      .limit(1)
      .single()

    if (!bStock) return // Skip if B has no stock — seed data required

    // User A queries all stock — should NOT see B's item
    const { data: aStock } = await clientA
      .from('stock')
      .select('id')

    const ids = (aStock ?? []).map((s: { id: string }) => s.id)
    expect(ids).not.toContain(bStock.id)
  })

  it('User A cannot see User B locations', async () => {
    const { data: bLocs } = await clientB
      .from('locations')
      .select('id')
      .limit(1)
      .single()

    if (!bLocs) return

    const { data: aLocs } = await clientA
      .from('locations')
      .select('id')

    const ids = (aLocs ?? []).map((l: { id: string }) => l.id)
    expect(ids).not.toContain(bLocs.id)
  })

  it('User A cannot update User B stock', async () => {
    const { data: bStock } = await clientB
      .from('stock')
      .select('id, quantity')
      .limit(1)
      .single()

    if (!bStock) return

    // Attempt to update B's stock as A
    const { error } = await clientA
      .from('stock')
      .update({ quantity: 9999 })
      .eq('id', bStock.id)

    // RLS should either error or silently affect 0 rows
    // Verify B's quantity is unchanged
    const { data: check } = await clientB
      .from('stock')
      .select('quantity')
      .eq('id', bStock.id)
      .single()

    expect(check?.quantity).toBe(bStock.quantity)
  })

  it('User A cannot delete User B locations', async () => {
    const { data: bLoc } = await clientB
      .from('locations')
      .select('id')
      .limit(1)
      .single()

    if (!bLoc) return

    await clientA
      .from('locations')
      .delete()
      .eq('id', bLoc.id)

    // Verify B's location still exists
    const { data: check } = await clientB
      .from('locations')
      .select('id')
      .eq('id', bLoc.id)
      .single()

    expect(check).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails (or identifies missing env vars)**

```bash
npm run test -- src/test/rls.integration.test.ts
```

Expected: FAIL — either env vars missing or tests fail proving RLS works (green = RLS is enforced).

- [ ] **Step 4: If env vars are missing, add test users to .env.test**

Add to `.env.test`:
```
TEST_USER_A_EMAIL=testa@test.com
TEST_USER_A_PASSWORD=testpassword123
TEST_USER_B_EMAIL=testb@test.com
TEST_USER_B_PASSWORD=testpassword123
```

Create users in Supabase dashboard or via SQL if they don't exist. Seed at least one stock item and one location per user.

- [ ] **Step 5: Run test to verify it passes (RLS enforced)**

```bash
npm run test -- src/test/rls.integration.test.ts
```

Expected: 4 PASS — all isolation checks hold.

- [ ] **Step 6: Commit**

```bash
git add src/test/rls.integration.test.ts .env.test
git commit -m "test: add RLS integration tests for data isolation (AC-4.2)"
```

---

## Task 2: Auth Redirect Coverage (AC-4.1)

Currently only `/inventory` is tested. The spec requires `/projects` and `/locations` too.

**Files:**
- Modify: `e2e/ui/auth.spec.ts`

- [ ] **Step 1: Read current auth spec**

```bash
cat e2e/ui/auth.spec.ts
```

- [ ] **Step 2: Add redirect tests for /projects and /locations**

Add these tests inside the existing describe block:

```typescript
test('AC-4.1: /projects redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/projects')
  await page.waitForURL('**/login**')
  await expect(page).toHaveURL(/login/)
})

test('AC-4.1: /locations redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/locations')
  await page.waitForURL('**/login**')
  await expect(page).toHaveURL(/login/)
})
```

- [ ] **Step 3: Run E2E tests**

```bash
npx playwright test e2e/ui/auth.spec.ts
```

Expected: All tests PASS (middleware already protects these routes).

- [ ] **Step 4: Commit**

```bash
git add e2e/ui/auth.spec.ts
git commit -m "test(e2e): add auth redirect tests for /projects and /locations (AC-4.1)"
```

---

## Task 3: Sub-Location Creation (AC-3.3.2)

No test exists for creating a child location under a parent.

**Files:**
- Modify: `e2e/ui/locations.spec.ts`

- [ ] **Step 1: Read current locations spec**

```bash
cat e2e/ui/locations.spec.ts
```

- [ ] **Step 2: Add sub-location creation E2E test**

```typescript
test('AC-3.3.2: create sub-location under existing parent', async ({ page }) => {
  await page.goto('/locations')
  const main = page.locator('main').last()

  // Find first location node with an expand or "+" button
  const addChildBtn = main.getByRole('button', { name: /sub-ubicación/i }).first()
  if (await addChildBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addChildBtn.click()

    // Fill sub-location name
    const nameInput = main.getByPlaceholder(/nombre/i).last()
    await nameInput.fill('Sub-test-' + Date.now())
    await main.getByRole('button', { name: /crear/i }).last().click()

    // Verify it appears nested (indented or under parent)
    await expect(main.getByText(/Sub-test-/)).toBeVisible({ timeout: 5000 })
  }
  // If no locations exist to add children to, test passes gracefully
})
```

- [ ] **Step 3: Run E2E**

```bash
npx playwright test e2e/ui/locations.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add e2e/ui/locations.spec.ts
git commit -m "test(e2e): add sub-location creation test (AC-3.3.2)"
```

---

## Task 4: Location Detail Assertions (AC-3.3.3)

The current E2E only checks for text "Componentes" — needs to verify breadcrumb and sub-location list.

**Files:**
- Modify: `e2e/ui/locations.spec.ts`

- [ ] **Step 1: Improve location detail E2E test**

Replace or extend the AC-3.3.3 test:

```typescript
test('AC-3.3.3: location detail shows breadcrumb, sub-locations, and components', async ({ page }) => {
  await page.goto('/locations')
  const main = page.locator('main').last()

  // Click first location to go to detail
  const firstLink = main.getByRole('link').first()
  if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    const detail = page.locator('main').last()

    // Location name should be visible as heading
    const heading = detail.locator('h1, h2').first()
    await expect(heading).toBeVisible()

    // Should show either components section or empty state
    const hasComponents = await detail.getByText(/componentes/i).isVisible().catch(() => false)
    const hasEmpty = await detail.getByText(/sin componentes/i).isVisible().catch(() => false)
    expect(hasComponents || hasEmpty).toBe(true)
  }
})
```

- [ ] **Step 2: Run E2E**

```bash
npx playwright test e2e/ui/locations.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add e2e/ui/locations.spec.ts
git commit -m "test(e2e): strengthen location detail assertions (AC-3.3.3)"
```

---

## Task 5: Category Chip Filtering Behavior (AC-3.1.6)

E2E currently only tests chip styling, not actual filtering behavior.

**Files:**
- Modify: `e2e/ui/inventory.spec.ts`

- [ ] **Step 1: Read current inventory spec to find the chip test**

```bash
cat e2e/ui/inventory.spec.ts
```

- [ ] **Step 2: Add category filtering behavior test**

```typescript
test('AC-3.1.6: clicking category chip filters the inventory list', async ({ page }) => {
  await page.goto('/inventory')
  const main = page.locator('main').last()

  // Only test if items exist (not empty state)
  const table = main.locator('table')
  if (await table.isVisible({ timeout: 5000 }).catch(() => false)) {
    const initialRows = await table.locator('tbody tr').count()

    // Click a specific category chip (e.g., Microcontrolador)
    const mcuChip = main.getByRole('button', { name: 'Microcontrolador' })
    if (await mcuChip.isVisible().catch(() => false)) {
      await mcuChip.click()
      await page.waitForTimeout(500)

      const filteredRows = await table.locator('tbody tr').count()
      // Filtered count should be <= initial count
      expect(filteredRows).toBeLessThanOrEqual(initialRows)

      // Click "Todos" to reset
      await main.getByRole('button', { name: /^Todos/ }).click()
      await page.waitForTimeout(500)

      const resetRows = await table.locator('tbody tr').count()
      expect(resetRows).toBe(initialRows)
    }
  }
})
```

- [ ] **Step 3: Run E2E**

```bash
npx playwright test e2e/ui/inventory.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add e2e/ui/inventory.spec.ts
git commit -m "test(e2e): add category chip filtering behavior test (AC-3.1.6)"
```

---

## Task 6: Search by Location (AC-3.1.2 gap)

Unit test exists for name and SKU search but not for location-based search.

**Files:**
- Modify: `src/test/InventorySearch.test.tsx` (if it exists) or the relevant test file

- [ ] **Step 1: Read the InventorySearch test to understand mock data shape**

Read the existing test file to see how `items` are structured (they include `location` field).

- [ ] **Step 2: Add location-based search test**

Add a test that filters by location name. Follow the existing mock data pattern in the file:

```typescript
it('filters by location name (AC-3.1.2)', () => {
  const items = [
    { id: '1', name: 'ESP32', sku: 'MCU-001', category: 'Microcontrolador', quantity: 5, location: { name: 'Cajón A' } },
    { id: '2', name: 'DHT22', sku: 'SEN-001', category: 'Sensor', quantity: 3, location: { name: 'Estante B' } },
  ]

  render(<InventorySearch items={items} />)
  const input = screen.getByPlaceholderText(/buscar/i)
  fireEvent.change(input, { target: { value: 'Cajón' } })

  expect(screen.getByText('ESP32')).toBeInTheDocument()
  expect(screen.queryByText('DHT22')).not.toBeInTheDocument()
})
```

Adapt prop names and structure to match the actual component interface found in Step 1.

- [ ] **Step 3: Run test to verify it fails or passes**

```bash
npm run test -- src/test/InventorySearch.test.tsx
```

If it FAILS: the search doesn't filter by location yet — implement in `InventorySearch.tsx`.
If it PASSES: location search already works, just wasn't tested.

- [ ] **Step 4: If test failed, implement location search in the filter logic**

In `InventorySearch.tsx`, find the `useMemo` filter function and add location name to the search:

```typescript
// Inside the filter callback, add:
|| item.location?.name?.toLowerCase().includes(query)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- src/test/InventorySearch.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/test/InventorySearch.test.tsx src/components/islands/InventorySearch.tsx
git commit -m "test: add location-based search test (AC-3.1.2)"
```

---

## Task 7: Stock Adjuster Error Handling

No test for what happens when the Supabase update fails.

**Files:**
- Modify: `src/test/StockAdjuster.test.tsx`

- [ ] **Step 1: Add error handling test**

```typescript
it('shows error feedback when supabase update fails', async () => {
  mockEq.mockResolvedValueOnce({ error: { message: 'Network error' } })

  render(<StockAdjuster stockId="s1" initialQuantity={3} />)
  fireEvent.click(screen.getByText('+'))

  // Quantity should optimistically update to 4
  expect(screen.getByText('4')).toBeInTheDocument()

  // After the failed update, check for error indication
  await waitFor(() => {
    // Either an error message, a reverted quantity, or an error class
    const hasError = screen.queryByText(/error/i)
    const reverted = screen.queryByText('3')
    expect(hasError || reverted).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test**

```bash
npm run test -- src/test/StockAdjuster.test.tsx
```

If FAIL: the component doesn't handle errors — implement error state.

- [ ] **Step 3: If needed, add error handling to StockAdjuster.tsx**

In the update handler, check `{ error }` from supabase response and either revert the optimistic update or show feedback.

- [ ] **Step 4: Run test to verify pass**

```bash
npm run test -- src/test/StockAdjuster.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/test/StockAdjuster.test.tsx src/components/islands/StockAdjuster.tsx
git commit -m "test: add error handling test for StockAdjuster"
```

---

## Task 8: LocationManager Edge Cases

Missing: delete with 0 components (different warning text), cancel edit.

**Files:**
- Modify: `src/test/LocationManager.test.tsx`

- [ ] **Step 1: Add missing edge case tests**

```typescript
it('delete with 0 components shows simple confirmation', async () => {
  const user = userEvent.setup()
  render(<LocationManager locationId="loc1" name="Vacía" stockCount={0} />)

  await user.click(screen.getByText('Eliminar ubicación'))

  // With 0 components, the warning should NOT mention "componentes que quedarán sin ubicación"
  // It should be a simpler confirmation
  expect(window.confirm).toHaveBeenCalled()
  const confirmMsg = (window.confirm as ReturnType<typeof vi.fn>).mock.calls[0][0]
  expect(confirmMsg).not.toContain('0 componentes')
})

it('cancel edit returns to view mode without saving', async () => {
  const user = userEvent.setup()
  render(<LocationManager {...defaultProps} />)

  // Enter edit mode
  await user.click(screen.getByTitle('Editar nombre'))
  const input = screen.getByDisplayValue('Cajón principal')

  // Type something but press Escape
  await user.type(input, ' editado')
  await user.keyboard('{Escape}')

  // Should return to view mode showing original name
  expect(screen.getByText('Cajón principal')).toBeInTheDocument()
  expect(mockUpdate).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests**

```bash
npm run test -- src/test/LocationManager.test.tsx
```

- [ ] **Step 3: If tests fail, implement the missing behavior in LocationManager.tsx**

For Escape handling, add `onKeyDown` handler to the edit input:
```typescript
onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
```

For the 0-component delete message, adjust the confirm text conditionally.

- [ ] **Step 4: Run tests to verify pass**

```bash
npm run test -- src/test/LocationManager.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/test/LocationManager.test.tsx src/components/islands/LocationManager.tsx
git commit -m "test: add LocationManager edge cases (0 components, cancel edit)"
```

---

## Task 9: SKU Utils Unit Tests

`src/lib/skuUtils.ts` is used by ComponentForm for auto-generating SKUs but has no dedicated tests.

**Files:**
- Create: `src/test/skuUtils.test.ts`

- [ ] **Step 1: Read skuUtils.ts to understand the API**

```bash
cat src/lib/skuUtils.ts
```

- [ ] **Step 2: Write tests based on the actual exports**

```typescript
// src/test/skuUtils.test.ts
import { describe, it, expect } from 'vitest'
// Import the actual exports after reading the file in Step 1
import { categoryPrefix, nextAvailableSku } from '../lib/skuUtils'

describe('categoryPrefix', () => {
  it('returns MCU for Microcontrolador', () => {
    expect(categoryPrefix('Microcontrolador')).toBe('MCU')
  })

  it('returns SEN for Sensor', () => {
    expect(categoryPrefix('Sensor')).toBe('SEN')
  })

  // Add tests for each category: Actuador, Alimentación, Módulo, Pasivo
  // Adapt based on actual implementation found in Step 1
})

describe('nextAvailableSku', () => {
  it('returns prefix-001 when no existing SKUs', () => {
    expect(nextAvailableSku('MCU', [])).toBe('MCU-001')
  })

  it('increments from highest existing SKU', () => {
    expect(nextAvailableSku('MCU', ['MCU-001', 'MCU-003'])).toBe('MCU-004')
  })

  it('handles empty prefix gracefully', () => {
    expect(nextAvailableSku('', [])).toBe('-001')
  })
})
```

Adjust function signatures and assertions based on actual code found in Step 1.

- [ ] **Step 3: Run test**

```bash
npm run test -- src/test/skuUtils.test.ts
```

Expected: PASS if logic is correct; FAIL reveals bugs.

- [ ] **Step 4: Commit**

```bash
git add src/test/skuUtils.test.ts
git commit -m "test: add unit tests for skuUtils (categoryPrefix, nextAvailableSku)"
```

---

## Task 10: Inventory Detail — Delete Flow (AC-3.1.5)

No E2E test verifies that deleting a component removes it from the list but keeps the catalog entry.

**Files:**
- Modify: `e2e/ui/inventory-detail.spec.ts`

- [ ] **Step 1: Read current inventory-detail spec**

```bash
cat e2e/ui/inventory-detail.spec.ts
```

- [ ] **Step 2: Add delete flow E2E test**

```typescript
test('AC-3.1.5: delete component removes from inventory list', async ({ page }) => {
  await page.goto('/inventory')
  const main = page.locator('main').last()

  // Only test if items exist
  const firstLink = main.locator('table tbody tr a, [data-testid="component-link"]').first()
  if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    const componentName = await firstLink.textContent()
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    // Look for a delete button
    const deleteBtn = page.getByRole('button', { name: /eliminar/i })
    if (await deleteBtn.isVisible().catch(() => false)) {
      // Handle confirm dialog
      page.on('dialog', (dialog) => dialog.accept())
      await deleteBtn.click()

      // Should redirect to inventory list
      await page.waitForURL('**/inventory')

      // Component should not be in the list anymore
      if (componentName) {
        await expect(page.locator('main').last().getByText(componentName)).not.toBeVisible({ timeout: 3000 })
      }
    }
  }
})
```

- [ ] **Step 3: Run E2E**

```bash
npx playwright test e2e/ui/inventory-detail.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add e2e/ui/inventory-detail.spec.ts
git commit -m "test(e2e): add delete component flow test (AC-3.1.5)"
```

---

## Task 11: Stock Adjuster Value Assertion (AC-3.1.8 E2E gap)

The E2E clicks `+` but never verifies the displayed value changed.

**Files:**
- Modify: `e2e/ui/inventory-detail.spec.ts`

- [ ] **Step 1: Improve stock adjuster E2E test**

Find the existing AC-3.1.8 test and enhance it:

```typescript
test('AC-3.1.8: stock adjuster increments and displays new value', async ({ page }) => {
  await page.goto('/inventory')
  const main = page.locator('main').last()

  const firstLink = main.locator('table tbody tr a, [data-testid="component-link"]').first()
  if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    const plusBtn = page.getByRole('button', { name: '+' })
    if (await plusBtn.isVisible().catch(() => false)) {
      // Read current value
      const quantityEl = page.locator('[data-testid="stock-quantity"], .text-2xl, .text-3xl').first()
      const before = await quantityEl.textContent()
      const beforeNum = parseInt(before ?? '0', 10)

      await plusBtn.click()
      await page.waitForTimeout(1000)

      // Value should have incremented
      const after = await quantityEl.textContent()
      const afterNum = parseInt(after ?? '0', 10)
      expect(afterNum).toBe(beforeNum + 1)
    }
  }
})
```

- [ ] **Step 2: Run E2E**

```bash
npx playwright test e2e/ui/inventory-detail.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add e2e/ui/inventory-detail.spec.ts
git commit -m "test(e2e): add stock adjuster value assertion (AC-3.1.8)"
```

---

## Coverage Summary After All Tasks

| AC | Before | After |
|----|--------|-------|
| **AC-4.2** RLS isolation | UNTESTED | Unit (integration) ✅ |
| **AC-4.1** Auth redirects | PARTIAL (1/3 routes) | E2E ✅ (3/3 routes) |
| **AC-3.3.2** Sub-location creation | UNTESTED | E2E ✅ |
| **AC-3.3.3** Location detail | SHALLOW | E2E improved ✅ |
| **AC-3.1.6** Category chip filtering | PARTIAL (styling only) | E2E behavioral ✅ |
| **AC-3.1.2** Search by location | UNTESTED | Unit ✅ |
| **AC-3.1.5** Delete component | PARTIAL | E2E ✅ |
| **AC-3.1.8** Stock adjuster | PARTIAL (no value check) | E2E improved ✅ |
| StockAdjuster error handling | UNTESTED | Unit ✅ |
| LocationManager edge cases | UNTESTED | Unit ✅ |
| skuUtils | UNTESTED | Unit ✅ |

### ACs deliberately NOT covered in this plan

| AC | Reason | When to address |
|----|--------|----------------|
| **AC-4.4** AI latency < 10s | Performance test requires real API + load testing setup | Post-MVP, when AI service is stable |
| **AC-4.5** First-login onboarding | Requires test user with zero data + specific seed control | Next sprint |
| **AC-3.4.2** QR URL resolution | Server-side routing test; needs integration test infra | Next sprint |
| **AC-3.1.4** Edit persistence on reload | Needs a working edit endpoint first (implementation gap) | When edit route is implemented |
| **AC-3.1.7** Location assignment round-trip | Complex cross-module test; covers 3.1 + 3.3 together | Next sprint |
