/**
 * Build-time SPX snapshot for GitHub Pages (Yahoo is CORS-blocked in browsers).
 * Fetches server-side during CI/local build and writes public/data/spx.json.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'public', 'data', 'spx.json')

const HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

async function fetchYahoo(symbol, range, interval) {
  const hosts = [
    'https://query1.finance.yahoo.com',
    'https://query2.finance.yahoo.com',
  ]
  const enc = encodeURIComponent(symbol)
  let lastErr
  for (const host of hosts) {
    const url = `${host}/v8/finance/chart/${enc}?range=${range}&interval=${interval}&includePrePost=false`
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const result = data?.chart?.result?.[0]
      if (!result?.timestamp?.length) throw new Error('empty')
      const q = result.indicators.quote[0]
      const candles = []
      for (let i = 0; i < result.timestamp.length; i++) {
        const close = q.close?.[i]
        if (close == null || !Number.isFinite(close)) continue
        const open = q.open?.[i] ?? close
        const high = q.high?.[i] ?? Math.max(open, close)
        const low = q.low?.[i] ?? Math.min(open, close)
        candles.push({
          time: result.timestamp[i],
          open,
          high,
          low,
          close,
          volume: q.volume?.[i] ?? undefined,
        })
      }
      if (candles.length) return candles
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('Yahoo failed')
}

async function main() {
  const symbols = ['^GSPC', 'SPY']
  let daily = null
  let weekly = null
  let hourly = null
  let source = 'Yahoo Finance'

  for (const sym of symbols) {
    try {
      if (!daily) daily = await fetchYahoo(sym, '10y', '1d')
      if (!weekly) weekly = await fetchYahoo(sym, 'max', '1wk')
      if (!hourly) hourly = await fetchYahoo(sym, '1mo', '1h')
      source = `Yahoo Finance (${sym})`
      if (daily && weekly && hourly) break
    } catch {
      /* try next symbol */
    }
  }

  if (!daily?.length) {
    console.warn('[prefetch-spx] failed to fetch Yahoo — keeping previous cache if any')
    process.exit(0)
  }

  mkdirSync(dirname(outPath), { recursive: true })
  const payload = {
    symbol: '^GSPC',
    source,
    savedAt: Date.now(),
    daily,
    weekly: weekly ?? daily,
    hourly: hourly ?? daily.slice(-200),
  }
  writeFileSync(outPath, JSON.stringify(payload))
  console.log(
    `[prefetch-spx] wrote ${outPath} daily=${daily.length} weekly=${payload.weekly.length} hourly=${payload.hourly.length}`,
  )
}

main().catch((e) => {
  console.warn('[prefetch-spx]', e)
  process.exit(0) // don't fail the build
})
