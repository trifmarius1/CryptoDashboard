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

  test('Add crypto opens catalog and can add a coin', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Add crypto/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: /Add crypto asset/i })).toBeVisible()
    // Wait for catalog finished loading
    await expect(page.getByText(/\d[\d,]* USDT pairs/i)).toBeVisible({ timeout: 60_000 })
    await page.getByPlaceholder(/Search/i).fill('DOGE')
    const dogeAdd = page.getByTestId('add-coin-DOGE')
    await expect(dogeAdd).toBeVisible({ timeout: 15_000 })
    await dogeAdd.click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })
    const dogeCard = page.locator('#asset-crypto-doge-usd')
    await dogeCard.scrollIntoViewIfNeeded()
    await expect(dogeCard).toBeVisible({ timeout: 20_000 })
    await expect(dogeCard.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
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

  test('ETH, TOTAL, and ETH/BTC cards render canvases', async ({ page }) => {
    await page.goto('/')
    for (const id of ['#asset-eth-usd', '#asset-total', '#asset-eth-btc']) {
      const card = page.locator(id)
      await card.scrollIntoViewIfNeeded()
      await expect(card).toBeVisible({ timeout: 30_000 })
      await expect(card.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
    }
  })

  test('watchlist jump opens asset from sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/')
    const side = page.getByRole('navigation', { name: 'Sidebar' })
    await side.getByRole('button', { name: /SOL\/USD/i }).click()
    await expect(page.locator('#asset-sol-usd')).toBeInViewport({ timeout: 15_000 })
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

test.describe('Buttons, controls & interactions', () => {
  test('crypto cards do not show EUR chart currency toggle', async ({ page }) => {
    await page.goto('/')
    const btc = page.locator('#asset-btc-usd')
    await expect(btc).toBeVisible({ timeout: 30_000 })
    await expect(btc.getByRole('button', { name: '€ EUR' })).toHaveCount(0)
    await expect(btc.getByRole('button', { name: '$ USD' })).toHaveCount(0)
    await expect(btc.getByRole('group', { name: /Chart display currency/i })).toHaveCount(0)
  })

  test('Add crypto modal closes via Escape and Close button', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Add crypto/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden({ timeout: 5_000 })

    await page.getByRole('button', { name: /Add crypto/i }).click()
    await expect(dialog).toBeVisible()
    await page.getByTestId('add-crypto-close').click()
    await expect(dialog).toBeHidden({ timeout: 5_000 })

    // Backdrop click (outside panel) also closes
    await page.getByRole('button', { name: /Add crypto/i }).click()
    await expect(dialog).toBeVisible()
    await page.getByTestId('add-crypto-dialog').click({ position: { x: 8, y: 8 } })
    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })

  test('add then remove a custom crypto card', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Add crypto/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByText(/\d[\d,]* USDT pairs/i)).toBeVisible({ timeout: 60_000 })
    await page.getByPlaceholder(/Search/i).fill('LINK')
    const addLink = page.getByTestId('add-coin-LINK')
    await expect(addLink).toBeVisible({ timeout: 15_000 })
    await addLink.click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    const link = page.locator('#asset-crypto-link-usd')
    await link.scrollIntoViewIfNeeded()
    await expect(link).toBeVisible({ timeout: 20_000 })
    await expect(link.locator('canvas').first()).toBeVisible({ timeout: 45_000 })

    await link.getByRole('button', { name: /Remove LINK\/USD/i }).click()
    await expect(page.locator('#asset-crypto-link-usd')).toHaveCount(0)
  })

  test('Shemitah overlay toggle on BTC chart', async ({ page }) => {
    await page.goto('/')
    const btc = page.locator('#asset-btc-usd')
    await btc.scrollIntoViewIfNeeded()
    const shemitahBtn = btc.getByRole('button', { name: /^Shemitah$/i })
    await expect(shemitahBtn).toBeVisible({ timeout: 15_000 })
    await expect(shemitahBtn).toHaveAttribute('aria-pressed', 'false')
    await shemitahBtn.click()
    await expect(shemitahBtn).toHaveAttribute('aria-pressed', 'true')
    await shemitahBtn.click()
    await expect(shemitahBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('timeframe days, weeks, years, all on BTC', async ({ page }) => {
    await page.goto('/')
    const btc = page.locator('#asset-btc-usd')
    await btc.scrollIntoViewIfNeeded()
    await expect(btc.locator('canvas').first()).toBeVisible({ timeout: 30_000 })

    await btc.getByRole('tab', { name: /Days/i }).click()
    await btc.getByRole('tab', { name: '7', exact: true }).first().click()
    await expect(btc.locator('canvas').first()).toBeVisible()

    await btc.getByRole('tab', { name: /Weeks/i }).click()
    await btc.getByRole('tab', { name: '4', exact: true }).first().click()
    await expect(btc.locator('canvas').first()).toBeVisible()

    await btc.getByRole('tab', { name: /Years/i }).click()
    for (const y of ['1', '2', '3', '4']) {
      await expect(btc.getByRole('tab', { name: y, exact: true }).first()).toBeVisible()
    }
    await btc.getByRole('tab', { name: '2', exact: true }).first().click()
    await expect(btc.locator('canvas').first()).toBeVisible()

    await btc.getByRole('tab', { name: /^All$/i }).click()
    await expect(btc.locator('canvas').first()).toBeVisible()
  })

  test('mobile nav: Home, Macro, Cycles round-trip', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Primary' })

    await nav.getByRole('button', { name: /Macro/i }).click()
    await expect(page.getByRole('heading', { name: /Macro Desk/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('#asset-spx')).toBeVisible({ timeout: 20_000 })

    await nav.getByRole('button', { name: /Cycles/i }).click()
    await expect(page.getByRole('heading', { name: /Shemitah/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('#asset-btc-usd-shemitah')).toBeVisible({ timeout: 20_000 })

    await nav.getByRole('button', { name: /Home/i }).click()
    await expect(page.getByRole('heading', { name: /Market Overview/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('#asset-btc-usd')).toBeVisible()
  })

  test('mobile hamburger opens and closes sidebar drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: /Open navigation/i }).click()
    const side = page.getByRole('navigation', { name: 'Sidebar' })
    await expect(side).toBeVisible()
    await side.getByRole('button', { name: /Macro/i }).click()
    await expect(page.getByRole('heading', { name: /Macro Desk/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('portfolio: add holding, EUR toggle, remove holding', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/')
    const side = page.getByRole('navigation', { name: 'Sidebar' })
    await side.getByRole('button', { name: /Portfolio/i }).click()
    await expect(page.getByText(/Live Portfolio Tracker/i)).toBeVisible({ timeout: 15_000 })

    const tracker = page.locator('#portfolio-tracker')
    await tracker.getByLabel(/Amount held/i).fill('0.05')
    await tracker.getByRole('button', { name: /Add to portfolio/i }).click()
    await expect(tracker.getByText(/Total portfolio value/i)).toBeVisible()

    // At least one remove control for a holding
    const removeBtn = tracker.getByRole('button', { name: /Remove /i }).first()
    await expect(removeBtn).toBeVisible({ timeout: 10_000 })

    await tracker.getByRole('button', { name: '€ EUR' }).click()
    await expect(tracker.getByText(/1 USD =/i)).toBeVisible({ timeout: 15_000 })
    await tracker.getByRole('button', { name: '$ USD' }).click()

    await removeBtn.click()
  })

  test('shemitah intelligence tabs switch content', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/')
    const side = page.getByRole('navigation', { name: 'Sidebar' })
    await side.getByRole('button', { name: /Shemitah/i }).click()
    await expect(page.locator('#shemitah')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /Historical Event Indicators/i }).click()
    await expect(page.getByText(/Historical Event Indicators/i).first()).toBeVisible()
    await page.getByRole('button', { name: /When to Invest/i }).click()
    await expect(page.getByText(/When to Invest/i).first()).toBeVisible()
  })

  test('hash deep-link opens portfolio section', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/#portfolio')
    await expect(
      page.getByRole('heading', { name: 'Live Portfolio', exact: true }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('#portfolio-tracker')).toBeVisible()
  })

  test('watchlist jumps: BTC, ETH, ADA', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.goto('/')
    const side = page.getByRole('navigation', { name: 'Sidebar' })

    await side.getByRole('button', { name: /BTC\/USD/i }).click()
    await expect(page.locator('#asset-btc-usd')).toBeInViewport({ timeout: 15_000 })

    await side.getByRole('button', { name: /ETH\/USD/i }).click()
    await expect(page.locator('#asset-eth-usd')).toBeInViewport({ timeout: 15_000 })

    await side.getByRole('button', { name: /ADA\/USD/i }).click()
    await expect(page.locator('#asset-ada-usd')).toBeInViewport({ timeout: 15_000 })
  })
})
