import { test, expect } from '@playwright/test'

test.describe('CryptoMacro UI — navigation & layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Market Overview/i })).toBeVisible({
      timeout: 30_000,
    })
  })

  test('loads dashboard shell without console page crash', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible()
    await expect(page.getByText('CryptoMacro').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /Single Crypto Assets/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Traditional Benchmarks/i })).toBeVisible()
  })

  test('sidebar navigates to Macro, Portfolio, Shemitah', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/')
    const side = page.getByRole('navigation', { name: 'Sidebar' })
    await expect(side).toBeVisible()

    await side.getByRole('button', { name: /Macro/i }).click()
    await expect(page.getByRole('heading', { name: /Macro Desk/i })).toBeVisible({
      timeout: 15_000,
    })

    await side.getByRole('button', { name: /Portfolio/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Live Portfolio', exact: true }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('heading', { name: 'Live Portfolio Tracker', exact: true }),
    ).toBeVisible()

    await side.getByRole('button', { name: /Shemitah/i }).click()
    await expect(page.getByText(/Shemitah/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('mobile bottom nav has 4 tabs and works', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Primary' })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('button', { name: /Home/i })).toBeVisible()
    await expect(nav.getByRole('button', { name: /Macro/i })).toBeVisible()
    await expect(nav.getByRole('button', { name: /Portfolio/i })).toBeVisible()
    await expect(nav.getByRole('button', { name: /Cycles/i })).toBeVisible()
    await expect(nav.getByRole('button', { name: /Settings/i })).toHaveCount(0)

    await nav.getByRole('button', { name: /Portfolio/i }).click()
    await expect(page.getByText(/Live Portfolio Tracker/i)).toBeVisible({ timeout: 15_000 })
  })

  test('settings is not reachable from UI', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Settings$/i })).toHaveCount(0)
    await page.goto('/#settings')
    await expect(page.getByRole('heading', { name: /^Settings$/i })).toHaveCount(0)
  })
})

test.describe('Charts & timeframes', () => {
  test('BTC chart card renders with timeframe controls', async ({ page }) => {
    await page.goto('/')
    const btc = page.locator('#asset-btc-usd')
    await expect(btc).toBeVisible({ timeout: 30_000 })
    await expect(btc.getByText('Bitcoin')).toBeVisible()
    await expect(btc.getByRole('tab', { name: /Years/i })).toBeVisible()
    await btc.getByRole('tab', { name: /Years/i }).click()
    await expect(btc.getByRole('tab', { name: '1', exact: true }).first()).toBeVisible()
    await expect(btc.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  })

  test('SPX equity card shows chart canvas', async ({ page }) => {
    await page.goto('/')
    const spx = page.locator('#asset-spx')
    await expect(spx).toBeVisible({ timeout: 30_000 })
    await expect(spx.getByText(/S&P 500/i)).toBeVisible()
    await expect(spx.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
  })

  test('Fear & Greed has line chart and pie gauge', async ({ page }) => {
    await page.goto('/')
    const fg = page.locator('#asset-fear-greed')
    await expect(fg).toBeVisible({ timeout: 30_000 })
    await expect(fg.getByText(/Fear & Greed/i)).toBeVisible()
    await expect(fg.getByText(/Live pie gauge/i)).toBeVisible()
    await expect(fg.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
    await expect(fg.locator('svg[role="img"]').first()).toBeVisible()
  })

  test('aggregate BTC.D card renders', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('#asset-btc-d')
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card.getByText(/BTC Dominance/i)).toBeVisible()
    await expect(card.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
  })

  test('timeframe hours 1-8 selectable on a chart', async ({ page }) => {
    await page.goto('/')
    const btc = page.locator('#asset-btc-usd')
    await btc.scrollIntoViewIfNeeded()
    await btc.getByRole('tab', { name: /Hours/i }).click()
    for (const n of ['1', '2', '4', '8']) {
      await expect(btc.getByRole('tab', { name: n, exact: true }).first()).toBeVisible()
    }
    await btc.getByRole('tab', { name: '4', exact: true }).first().click()
    await expect(btc.locator('canvas').first()).toBeVisible()
  })

  test('months 1-12 selectable', async ({ page }) => {
    await page.goto('/')
    const btc = page.locator('#asset-btc-usd')
    await btc.scrollIntoViewIfNeeded()
    await btc.getByRole('tab', { name: /Months/i }).click()
    await expect(btc.getByRole('tab', { name: '12', exact: true }).first()).toBeVisible()
    await btc.getByRole('tab', { name: '6', exact: true }).first().click()
    await expect(btc.locator('canvas').first()).toBeVisible()
  })
})

test.describe('Portfolio tracker', () => {
  test('add holding and switch currency', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/')
    const side = page.getByRole('navigation', { name: 'Sidebar' })
    await side.getByRole('button', { name: /Portfolio/i }).click()
    await expect(page.getByText(/Live Portfolio Tracker/i)).toBeVisible({ timeout: 15_000 })

    const tracker = page.locator('#portfolio-tracker')
    await tracker.getByLabel(/Amount held/i).fill('0.01')
    await tracker.getByRole('button', { name: /Add to portfolio/i }).click()

    await expect(tracker.getByText(/Total portfolio value/i)).toBeVisible()
    await tracker.getByRole('button', { name: '$ USD' }).or(tracker.getByRole('button', { name: '€ EUR' })).first()
    await tracker.getByRole('button', { name: '€ EUR' }).click()
    await tracker.getByRole('button', { name: '$ USD' }).click()
  })

  test('export/import JSON buttons are not shown', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/')
    const side = page.getByRole('navigation', { name: 'Sidebar' })
    await side.getByRole('button', { name: /Portfolio/i }).click()
    await expect(page.getByText(/Live Portfolio Tracker/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Export JSON/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Import JSON/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Clear all/i })).toHaveCount(0)
  })
})

test.describe('Header ticker & market tape', () => {
  test('shows Global MCap, BTC.D, S&P, Fear & Greed labels', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Global MCap/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/BTC\.D/i).first()).toBeVisible()
    await expect(page.getByText(/S&P 500/i).first()).toBeVisible()
    await expect(page.getByText(/Fear & Greed/i).first()).toBeVisible()
  })
})

test.describe('Security basics', () => {
  test('page has CSP and referrer policy meta tags', async ({ page }) => {
    await page.goto('/')
    const csp = page.locator('meta[http-equiv="Content-Security-Policy"]')
    await expect(csp).toHaveCount(1)
    const content = await csp.getAttribute('content')
    expect(content).toContain("default-src 'self'")
    expect(content).toContain("object-src 'none'")
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'strict-origin-when-cross-origin',
    )
  })

  test('no mixed-content http scripts on page', async ({ page }) => {
    await page.goto('/')
    const scripts = page.locator('script[src^="http:"]')
    await expect(scripts).toHaveCount(0)
  })

  test('asset ids are unique on dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#asset-btc-usd')).toHaveCount(1)
    await expect(page.locator('#asset-spx')).toHaveCount(1)
    await expect(page.locator('#asset-btc-usd-shemitah')).toHaveCount(1)
    await expect(page.locator('#asset-spx-shemitah')).toHaveCount(1)
  })
})
