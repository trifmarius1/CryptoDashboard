import { test, expect } from '@playwright/test'

/**
 * API / data-source smoke tests (proxied in dev).
 */
test.describe('Market data APIs', () => {
  test('Binance BTC klines respond with OHLC rows', async ({ request }) => {
    const res = await request.get(
      '/api/binance/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=5',
    )
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()) as unknown[][]
    expect(data.length).toBeGreaterThanOrEqual(1)
    expect(Number(data[0][4])).toBeGreaterThan(0) // close
  })

  test('Binance 24h ticker has lastPrice', async ({ request }) => {
    const res = await request.get('/api/binance/api/v3/ticker/24hr?symbol=ETHUSDT')
    expect(res.ok()).toBeTruthy()
    const t = (await res.json()) as { lastPrice: string; priceChangePercent: string }
    expect(Number(t.lastPrice)).toBeGreaterThan(0)
    expect(Number.isFinite(Number(t.priceChangePercent))).toBeTruthy()
  })

  test('Yahoo SPX chart returns series', async ({ request }) => {
    const res = await request.get(
      '/api/yahoo/v8/finance/chart/%5EGSPC?range=1y&interval=1d&includePrePost=false',
      { headers: { Accept: 'application/json' } },
    )
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as {
      chart: { result?: Array<{ timestamp?: number[]; indicators: { quote: Array<{ close?: (number | null)[] }> } }> }
    }
    const result = body.chart.result?.[0]
    expect(result?.timestamp?.length).toBeGreaterThan(50)
    const closes = result!.indicators.quote[0].close ?? []
    const valid = closes.filter((c) => c != null && Number.isFinite(c))
    expect(valid.length).toBeGreaterThan(50)
  })

  test('CoinLore global market snapshot', async ({ request }) => {
    const res = await request.get('/api/coinlore/api/global/')
    expect(res.ok()).toBeTruthy()
    const arr = (await res.json()) as Array<{ total_mcap: number; btc_d: string }>
    expect(arr[0].total_mcap).toBeGreaterThan(1e11)
    expect(Number(arr[0].btc_d)).toBeGreaterThan(10)
  })

  test('Fear & Greed index history', async ({ request }) => {
    const res = await request.get('/api/fng/fng/?limit=10&format=json')
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { data: Array<{ value: string }> }
    expect(body.data.length).toBeGreaterThan(0)
    expect(Number(body.data[0].value)).toBeGreaterThanOrEqual(0)
    expect(Number(body.data[0].value)).toBeLessThanOrEqual(100)
  })

  test('Frankfurter USD/EUR FX rate', async ({ request }) => {
    const res = await request.get('/api/fx/latest?from=USD&to=EUR')
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { rates: { EUR: number } }
    expect(body.rates.EUR).toBeGreaterThan(0.5)
    expect(body.rates.EUR).toBeLessThan(2)
  })

  test('SPX build snapshot asset is available', async ({ request }) => {
    const res = await request.get('/data/spx.json')
    // May 404 in pure dev if not prefetched — accept either OK data or skip
    if (res.status() === 404) {
      test.skip()
      return
    }
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { daily: Array<{ close: number }> }
    expect(body.daily.length).toBeGreaterThan(100)
  })
})
