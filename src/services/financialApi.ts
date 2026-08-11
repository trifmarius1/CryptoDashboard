/**
 * Unified financial data service layer.
 *
 * Speed-first multi-tier strategy:
 *   Tier 1 — WebSocket primary (Binance streams)
 *   Tier 2 — Fast REST (Binance klines + CoinLore global race)
 *   Tier 3 — Yahoo (equity) / CryptoCompare fallback
 *   Aggregates — shared Binance base for BTC.D/TOTAL/TOTAL2/TOTAL3 (one pull)
 *   Cache — in-memory (90s) → IndexedDB (stale-while-revalidate) → synthetic
 *
 * All network calls use AbortController timeouts. CoinGecko is only used as a
 * parallel global-snapshot candidate (never on the chart hot path — it rate-limits
 * and hangs multi-year requests).
 *
 * All public methods normalize to Candle[] / AssetQuote / MarketOverview.
 */
import {
  BINANCE_INTERVAL_MAP,
  fearGreedLimit,
  parseTimeframe,
  TIMEFRAME_LOOKBACK_SEC,
  YAHOO_RANGE_MAP,
} from '../constants/assets'
import type {
  AssetDefinition,
  AssetQuote,
  Candle,
  FeedStatus,
  MarketOverview,
  Timeframe,
} from '../types'
import { requireAssetById } from './assetRegistry'
import { loadCandles, saveCandles } from './cache'

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Dev uses Vite proxy; production (GitHub Pages) hits public APIs directly. */
const DEV = import.meta.env.DEV
const BINANCE_REST = DEV ? '/api/binance' : 'https://api.binance.com'
const BINANCE_REST_DIRECT = 'https://api.binance.com'
const COINGECKO = DEV ? '/api/coingecko' : 'https://api.coingecko.com'
const COINLORE = DEV ? '/api/coinlore' : 'https://api.coinlore.net'
const YAHOO = DEV ? '/api/yahoo' : 'https://query1.finance.yahoo.com'
const CRYPTOCOMPARE = DEV ? '/api/cryptocompare' : 'https://min-api.cryptocompare.com'
const FNG = DEV ? '/api/fng' : 'https://api.alternative.me'

/** Short TTL + in-flight coalescing so widgets don't stampede APIs. */
const JSON_CACHE_TTL_MS = 90_000
const CANDLE_MEM_TTL_MS = 90_000
const DEFAULT_FETCH_TIMEOUT_MS = 8_000
const FAST_FETCH_TIMEOUT_MS = 5_000

const jsonCache = new Map<string, { at: number; data: unknown }>()
const jsonInflight = new Map<string, Promise<unknown>>()
/** In-memory candle results — typed loosely until CandleResult is declared below. */
const candleMemCache = new Map<string, { at: number; result: { candles: Candle[]; status: FeedStatus } }>()
const candleInflight = new Map<string, Promise<{ candles: Candle[]; status: FeedStatus }>>()

function assetById(id: string): AssetDefinition {
  return requireAssetById(id)
}

function candleKey(assetId: string, timeframe: Timeframe): string {
  return `${assetId}::${timeframe}`
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Timeout ${timeoutMs}ms for ${url}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Cached GET with request coalescing (shared across aggregate widgets). */
async function fetchJsonCached<T>(
  url: string,
  ttlMs = JSON_CACHE_TTL_MS,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<T> {
  const hit = jsonCache.get(url)
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T

  const pending = jsonInflight.get(url)
  if (pending) return pending as Promise<T>

  const promise = fetchJson<T>(url, undefined, timeoutMs)
    .then((data) => {
      jsonCache.set(url, { at: Date.now(), data })
      jsonInflight.delete(url)
      return data
    })
    .catch((err) => {
      jsonInflight.delete(url)
      throw err
    })

  jsonInflight.set(url, promise)
  return promise
}

const BINANCE_MAX_LIMIT = 1000

async function fetchBinanceKlinesOnce(
  symbol: string,
  interval: string,
  limit: number,
  endTime?: number,
): Promise<unknown[][]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(Math.min(limit, BINANCE_MAX_LIMIT)),
  })
  if (endTime != null) params.set('endTime', String(endTime))
  const path = `/api/v3/klines?${params.toString()}`
  // Race proxy vs direct — first success wins (avoids slow proxy fallback wait)
  try {
    return await Promise.any([
      fetchJson<unknown[][]>(`${BINANCE_REST}${path}`, undefined, FAST_FETCH_TIMEOUT_MS),
      fetchJson<unknown[][]>(
        `${BINANCE_REST_DIRECT}${path}`,
        undefined,
        FAST_FETCH_TIMEOUT_MS,
      ),
    ])
  } catch {
    // Last try with longer timeout via proxy only
    return fetchJson<unknown[][]>(`${BINANCE_REST}${path}`, undefined, DEFAULT_FETCH_TIMEOUT_MS)
  }
}

/**
 * Prefer Vite proxy; fall back to direct origin.
 * Paginates when limit &gt; 1000 so 2Y–4Y daily series can be filled.
 */
async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  limit: number,
): Promise<unknown[][]> {
  if (limit <= BINANCE_MAX_LIMIT) {
    return fetchBinanceKlinesOnce(symbol, interval, limit)
  }

  const batches: unknown[][] = []
  let remaining = limit
  let endTime: number | undefined

  while (remaining > 0) {
    const batchSize = Math.min(remaining, BINANCE_MAX_LIMIT)
    const chunk = await fetchBinanceKlinesOnce(symbol, interval, batchSize, endTime)
    if (!chunk.length) break
    batches.push(...chunk)
    remaining -= chunk.length
    // Oldest open time in this chunk — step before it for the next page
    const oldestOpen = Number(chunk[0][0])
    if (!Number.isFinite(oldestOpen)) break
    endTime = oldestOpen - 1
    // Avoid infinite loop if API returns the same window
    if (chunk.length < batchSize) break
  }

  // batches are newest-first pages appended; sort by open time ascending
  batches.sort((a, b) => Number(a[0]) - Number(b[0]))
  // Deduplicate by open time
  const seen = new Set<number>()
  const unique: unknown[][] = []
  for (const row of batches) {
    const t = Number(row[0])
    if (seen.has(t)) continue
    seen.add(t)
    unique.push(row)
  }
  return unique.slice(-limit)
}

function parseBinanceKlines(raw: unknown[][]): Candle[] {
  return raw.map((k) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }))
}

function ensureAscendingUnique(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>()
  for (const c of candles) {
    if (Number.isFinite(c.time) && Number.isFinite(c.close)) {
      map.set(c.time, c)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time)
}

// ─── Synthetic / seed generators (last-resort offline UX) ──────────────────

function seedFromSymbol(symbol: string): number {
  let h = 0
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0
  return Math.abs(h) % 10000
}

function syntheticPointCount(timeframe: Timeframe): number {
  const { interval, limit } = BINANCE_INTERVAL_MAP[timeframe]
  void interval
  return Math.min(limit, 800)
}

function syntheticStepSec(timeframe: Timeframe): number {
  const { unit } = parseTimeframe(timeframe)
  switch (unit) {
    case 'H':
      return 60
    case 'D':
      return timeframe === '1D' ? 15 * 60 : 3600
    case 'W':
      return 4 * 3600
    case 'M':
    case 'Y':
      return 86_400
    case 'ALL':
      return 7 * 86_400
    default:
      return 3600
  }
}

function generateSyntheticCandles(
  asset: AssetDefinition,
  timeframe: Timeframe,
  count = syntheticPointCount(timeframe),
): Candle[] {
  const bases: Record<string, number> = {
    'btc-usd': 95_000,
    'eth-usd': 3_400,
    'sol-usd': 180,
    'ada-usd': 0.72,
    spx: 5_600,
    'btc-d': 54,
    total: 3.2e12,
    total2: 1.45e12,
    total3: 9.5e11,
    'fear-greed': 45,
    'eth-btc': 0.036,
    'sol-btc': 0.0019,
    'ada-btc': 0.0000075,
  }
  const base = bases[asset.id] ?? 100
  const step = syntheticStepSec(timeframe)
  const now = Math.floor(Date.now() / 1000)
  const seed = seedFromSymbol(asset.id)
  let price = base
  const out: Candle[] = []
  for (let i = count; i >= 0; i--) {
    const t = now - i * step
    const noise = Math.sin((t + seed) / (step * 7)) * 0.012
    const drift = Math.cos((t + seed * 3) / (step * 40)) * 0.008
    const open = price
    let close = price * (1 + noise + drift * 0.3)
    if (asset.id === 'fear-greed') {
      close = Math.min(100, Math.max(0, 50 + Math.sin((t + seed) / (step * 20)) * 25))
    }
    const high = Math.max(open, close) * (1 + Math.abs(noise) * 0.5)
    const low = Math.min(open, close) * (1 - Math.abs(noise) * 0.5)
    out.push({
      time: t,
      open: asset.id === 'fear-greed' ? close : open,
      high: asset.id === 'fear-greed' ? close : high,
      low: asset.id === 'fear-greed' ? close : low,
      close,
      volume: base * (0.5 + Math.abs(noise) * 20),
    })
    price = close
  }
  return out
}

// ─── Tier fetchers ─────────────────────────────────────────────────────────

async function fetchBinanceCandles(
  asset: AssetDefinition,
  timeframe: Timeframe,
): Promise<Candle[]> {
  if (!asset.binanceSymbol) throw new Error('No binance symbol')
  const { interval, limit } = BINANCE_INTERVAL_MAP[timeframe]
  const raw = await fetchBinanceKlines(asset.binanceSymbol, interval, limit)
  return ensureAscendingUnique(parseBinanceKlines(raw))
}

async function fetchYahooCandlesOnce(
  symbol: string,
  timeframe: Timeframe,
  hostBase: string,
): Promise<Candle[]> {
  const enc = encodeURIComponent(symbol)
  const { range, interval } = YAHOO_RANGE_MAP[timeframe]
  const url = `${hostBase}/v8/finance/chart/${enc}?range=${range}&interval=${interval}&includePrePost=false`
  const data = await fetchJson<{
    chart: {
      result?: Array<{
        timestamp?: number[]
        indicators: {
          quote: Array<{
            open?: (number | null)[]
            high?: (number | null)[]
            low?: (number | null)[]
            close?: (number | null)[]
            volume?: (number | null)[]
          }>
        }
      }>
      error?: { description?: string }
    }
  }>(url, undefined, DEFAULT_FETCH_TIMEOUT_MS)

  if (data.chart.error?.description) {
    throw new Error(data.chart.error.description)
  }
  const result = data.chart.result?.[0]
  if (!result?.timestamp?.length) throw new Error('Yahoo empty')

  const q = result.indicators.quote[0]
  const candles: Candle[] = []
  for (let i = 0; i < result.timestamp.length; i++) {
    const close = q.close?.[i]
    if (close == null || !Number.isFinite(close)) continue
    // Yahoo sometimes nulls OHLC on partial bars — synthesize from close
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
  let series = ensureAscendingUnique(candles)
  const lookback = TIMEFRAME_LOOKBACK_SEC[timeframe]
  if (lookback && series.length) {
    const cutoff = series[series.length - 1].time - lookback
    series = series.filter((c) => c.time >= cutoff)
  }
  if (!series.length) throw new Error('Yahoo parse empty')
  return series
}

/** Yahoo chart: race hosts + ^GSPC/SPY symbols. */
async function fetchYahooCandles(
  asset: AssetDefinition,
  timeframe: Timeframe,
): Promise<Candle[]> {
  const symbols = [
    asset.yahooSymbol ?? '^GSPC',
    asset.yahooSymbol === 'SPY' ? '^GSPC' : 'SPY',
  ].filter((s, i, a) => a.indexOf(s) === i)

  const hosts = DEV
    ? [YAHOO]
    : ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']

  const errors: string[] = []
  for (const sym of symbols) {
    for (const host of hosts) {
      try {
        const series = await fetchYahooCandlesOnce(sym, timeframe, host)
        if (series.length) return series
      } catch (e) {
        errors.push(`${sym}@${host}: ${String(e)}`)
      }
    }
  }

  // Production: Yahoo blocks browser CORS — try free CORS gateways
  if (!DEV) {
    for (const sym of symbols) {
      const { range, interval } = YAHOO_RANGE_MAP[timeframe]
      const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}&includePrePost=false`
      const proxyUrls = [
        `https://corsproxy.io/?${encodeURIComponent(target)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      ]
      for (const purl of proxyUrls) {
        try {
          const data = await fetchJson<{
            chart: {
              result?: Array<{
                timestamp?: number[]
                indicators: {
                  quote: Array<{
                    open?: (number | null)[]
                    high?: (number | null)[]
                    low?: (number | null)[]
                    close?: (number | null)[]
                    volume?: (number | null)[]
                  }>
                }
              }>
            }
          }>(purl, undefined, DEFAULT_FETCH_TIMEOUT_MS)
          const result = data.chart.result?.[0]
          if (!result?.timestamp?.length) continue
          const q = result.indicators.quote[0]
          const candles: Candle[] = []
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
          let series = ensureAscendingUnique(candles)
          const lookback = TIMEFRAME_LOOKBACK_SEC[timeframe]
          if (lookback && series.length) {
            const cutoff = series[series.length - 1].time - lookback
            series = series.filter((c) => c.time >= cutoff)
          }
          if (series.length) return series
        } catch (e) {
          errors.push(`proxy: ${String(e)}`)
        }
      }
    }
  }

  throw new Error(errors[0] ?? 'Yahoo failed')
}

/**
 * Build-time SPX snapshot (public/data/spx.json) for GitHub Pages offline backup.
 */
async function fetchSpxStaticCandles(timeframe: Timeframe): Promise<Candle[]> {
  const base = import.meta.env.BASE_URL || '/'
  const path = `${base.endsWith('/') ? base : `${base}/`}data/spx.json`
  const data = await fetchJson<{
    daily?: Candle[]
    weekly?: Candle[]
    hourly?: Candle[]
  }>(path, undefined, FAST_FETCH_TIMEOUT_MS)

  const { unit, n } = parseTimeframe(timeframe)
  let series: Candle[] = []
  if (unit === 'H' || (unit === 'D' && n <= 7) || unit === 'W') {
    series = data.hourly?.length ? data.hourly : (data.daily ?? [])
  } else if (unit === 'ALL' || (unit === 'Y' && n >= 3)) {
    series = data.weekly?.length ? data.weekly : (data.daily ?? [])
  } else {
    series = data.daily ?? []
  }
  if (!series.length && data.daily?.length) series = data.daily

  series = ensureAscendingUnique(
    series.map((c) => ({
      time: Number(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: c.volume != null ? Number(c.volume) : undefined,
    })),
  )
  const lookback = TIMEFRAME_LOOKBACK_SEC[timeframe]
  if (lookback && series.length) {
    const cutoff = series[series.length - 1].time - lookback
    series = series.filter((c) => c.time >= cutoff)
  }
  if (!series.length) throw new Error('Static SPX empty')
  return series
}

/** Equity multi-source: Yahoo live → static snapshot. */
async function fetchEquityCandles(
  asset: AssetDefinition,
  timeframe: Timeframe,
): Promise<{ candles: Candle[]; source: string }> {
  const errors: string[] = []
  try {
    const candles = await fetchYahooCandles(asset, timeframe)
    if (candles.length) return { candles, source: 'Yahoo Finance' }
  } catch (e) {
    errors.push(`Yahoo: ${String(e)}`)
  }

  if (
    asset.id === 'spx' ||
    asset.yahooSymbol === '^GSPC' ||
    asset.yahooSymbol === 'SPY'
  ) {
    try {
      const candles = await fetchSpxStaticCandles(timeframe)
      if (candles.length) return { candles, source: 'SPX snapshot (build cache)' }
    } catch (e) {
      errors.push(`Static: ${String(e)}`)
    }
  }

  throw new Error(errors.join(' | ') || 'Equity series failed')
}

/** CryptoCompare OHLCV as tertiary REST fallback. */
async function fetchCryptoCompareCandles(
  asset: AssetDefinition,
  timeframe: Timeframe,
): Promise<Candle[]> {
  if (!asset.binanceSymbol) throw new Error('No pair for CryptoCompare')

  // Parse base/quote from Binance symbol e.g. BTCUSDT → BTC/USDT
  const sym = asset.binanceSymbol
  let fsym = 'BTC'
  let tsym = 'USD'
  if (sym.endsWith('USDT')) {
    fsym = sym.slice(0, -4)
    tsym = 'USDT'
  } else if (sym.endsWith('BTC')) {
    fsym = sym.slice(0, -3)
    tsym = 'BTC'
  }

  const { unit, n } = parseTimeframe(timeframe)
  let path = 'histoday'
  let limit = 30
  let aggregate = 1
  if (unit === 'H') {
    path = 'histominute'
    limit = n * 60
  } else if (unit === 'D') {
    if (n === 1) {
      path = 'histominute'
      limit = 96
      aggregate = 15
    } else {
      path = 'histohour'
      limit = n * 24
    }
  } else if (unit === 'W') {
    path = 'histohour'
    limit = n * 168
    aggregate = 4
  } else if (unit === 'M') {
    path = 'histoday'
    limit = Math.min(Math.round(n * 30.44), 370)
  } else if (unit === 'Y') {
    path = 'histoday'
    limit = Math.min(n * 365, 2000)
  } else {
    path = 'histoday'
    limit = 2000
    aggregate = 7
  }

  const url = `${CRYPTOCOMPARE}/data/v2/${path}?fsym=${fsym}&tsym=${tsym}&limit=${limit}&aggregate=${aggregate}`
  const data = await fetchJson<{
    Data?: { Data?: Array<{ time: number; open: number; high: number; low: number; close: number; volumefrom?: number }> }
    Response?: string
  }>(url)

  const rows = data.Data?.Data
  if (!rows?.length) throw new Error('CryptoCompare empty')
  return ensureAscendingUnique(
    rows.map((r) => ({
      time: r.time,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volumefrom,
    })),
  )
}

// ─── Global market snapshot (multi-provider) ───────────────────────────────

interface GlobalSnapshot {
  totalMarketCap: number
  totalVolume24h: number
  btcDominance: number
  ethDominance: number
  btcMarketCap: number
  ethMarketCap: number
  marketCapChange24h: number
  source: string
}

async function fetchGlobalFromCoinGecko(): Promise<GlobalSnapshot> {
  const global = await fetchJsonCached<{
    data: {
      total_market_cap: { usd: number }
      total_volume: { usd: number }
      market_cap_percentage: { btc: number; eth: number }
      market_cap_change_percentage_24h_usd?: number
    }
  }>(`${COINGECKO}/api/v3/global`)
  const d = global.data
  const total = d.total_market_cap.usd
  const btcDom = d.market_cap_percentage.btc || 50
  const ethDom = d.market_cap_percentage.eth || 15
  return {
    totalMarketCap: total,
    totalVolume24h: d.total_volume.usd,
    btcDominance: btcDom,
    ethDominance: ethDom,
    btcMarketCap: total * (btcDom / 100),
    ethMarketCap: total * (ethDom / 100),
    marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? 0,
    source: 'CoinGecko',
  }
}

async function fetchGlobalFromCoinLore(): Promise<GlobalSnapshot> {
  const [globalArr, tickers] = await Promise.all([
    fetchJsonCached<
      Array<{
        total_mcap: number
        total_volume: number
        btc_d: string
        eth_d: string
        mcap_change: string
      }>
    >(`${COINLORE}/api/global/`),
    fetchJsonCached<
      Array<{
        symbol: string
        market_cap_usd: string
      }>
    >(`${COINLORE}/api/ticker/?id=90,80`),
  ])
  const g = globalArr[0]
  if (!g) throw new Error('CoinLore global empty')
  const btcDom = Number(g.btc_d) || 50
  const ethDom = Number(g.eth_d) || 12
  const btcRow = tickers.find((t) => t.symbol === 'BTC')
  const ethRow = tickers.find((t) => t.symbol === 'ETH')
  const total = Number(g.total_mcap)
  return {
    totalMarketCap: total,
    totalVolume24h: Number(g.total_volume),
    btcDominance: btcDom,
    ethDominance: ethDom,
    btcMarketCap: btcRow ? Number(btcRow.market_cap_usd) : total * (btcDom / 100),
    ethMarketCap: ethRow ? Number(ethRow.market_cap_usd) : total * (ethDom / 100),
    marketCapChange24h: Number(g.mcap_change) || 0,
    source: 'CoinLore',
  }
}

/**
 * Race global providers — first healthy response wins.
 * Prefers fast free APIs (CoinLore); CoinGecko included in parallel.
 */
async function fetchGlobalSnapshot(): Promise<GlobalSnapshot> {
  const cacheKey = '__global_snapshot__'
  const hit = jsonCache.get(cacheKey)
  if (hit && Date.now() - hit.at < JSON_CACHE_TTL_MS) {
    return hit.data as GlobalSnapshot
  }
  const pending = jsonInflight.get(cacheKey)
  if (pending) return pending as Promise<GlobalSnapshot>

  const promise = (async () => {
    // CoinLore first (reliable free); CoinGecko parallel.
    const candidates = [
      fetchGlobalFromCoinLore(),
      fetchGlobalFromCoinGecko(),
    ].map((p) =>
      p.then((snap) => {
        if (!(snap.totalMarketCap > 0 && snap.btcDominance > 0)) {
          throw new Error('invalid snapshot')
        }
        return snap
      }),
    )

    try {
      const snap = await Promise.any(candidates)
      jsonCache.set(cacheKey, { at: Date.now(), data: snap })
      return snap
    } catch {
      throw new Error('All global providers failed')
    }
  })().finally(() => {
    jsonInflight.delete(cacheKey)
  })

  jsonInflight.set(cacheKey, promise)
  return promise
}

function pointCandle(time: number, value: number): Candle {
  return { time, open: value, high: value, low: value, close: value }
}

type CapPoint = { time: number; value: number }

/**
 * Align ETH caps to BTC timestamps in O(n) with two pointers
 * (avoids O(n²) nearest-neighbor scans on multi-year series).
 */
function alignEthCaps(btcCaps: CapPoint[], ethCaps: CapPoint[], fallback: number): number[] {
  if (!ethCaps.length) return btcCaps.map(() => fallback)
  const ethSorted = [...ethCaps].sort((a, b) => a.time - b.time)
  const out: number[] = new Array(btcCaps.length)
  let j = 0
  for (let i = 0; i < btcCaps.length; i++) {
    const t = btcCaps[i].time
    while (j < ethSorted.length - 1 && ethSorted[j + 1].time <= t) j++
    // pick closer of j and j+1
    let pick = ethSorted[j]
    if (j + 1 < ethSorted.length) {
      const next = ethSorted[j + 1]
      if (Math.abs(next.time - t) < Math.abs(pick.time - t)) pick = next
    }
    out[i] = pick.value
  }
  return out
}

/**
 * Build TOTAL / TOTAL2 / TOTAL3 / BTC.D series from BTC+ETH market-cap history
 * and a live global snapshot.
 */
function buildAggregateCandles(
  assetId: string,
  btcCaps: CapPoint[],
  ethCaps: CapPoint[],
  snap: GlobalSnapshot,
): Candle[] {
  if (!btcCaps.length) throw new Error('No BTC market-cap points')

  const ethAligned = alignEthCaps(
    btcCaps,
    ethCaps,
    snap.ethMarketCap || snap.btcMarketCap * 0.2,
  )

  const btcNow = btcCaps[btcCaps.length - 1].value
  const ethNow = ethAligned[ethAligned.length - 1] || snap.ethMarketCap
  const othersNow = Math.max(
    0,
    snap.totalMarketCap - snap.btcMarketCap - snap.ethMarketCap,
  )

  const out: Candle[] = []
  for (let i = 0; i < btcCaps.length; i++) {
    const { time, value: btcCapRaw } = btcCaps[i]
    const isLast = i === btcCaps.length - 1
    const btcCap = isLast ? snap.btcMarketCap : btcCapRaw
    const ethCap = isLast ? snap.ethMarketCap : ethAligned[i]

    const btcRatio = btcNow > 0 ? btcCapRaw / btcNow : 1
    const ethRatio = ethNow > 0 ? ethCap / ethNow : btcRatio
    const othersRatio =
      Math.pow(Math.max(0.05, ethRatio), 0.85) *
      Math.pow(Math.max(0.05, btcRatio), 0.15)
    const others = isLast ? othersNow : othersNow * othersRatio

    const total = btcCap + ethCap + others
    const total2 = Math.max(0, total - btcCap)
    const total3 = Math.max(0, total - btcCap - ethCap)
    const btcDom = total > 0 ? (btcCap / total) * 100 : snap.btcDominance

    let value: number
    switch (assetId) {
      case 'btc-d':
        value = Math.min(85, Math.max(25, btcDom))
        break
      case 'total':
        value = total
        break
      case 'total2':
        value = total2
        break
      case 'total3':
        value = total3
        break
      default:
        throw new Error(`Unsupported aggregate ${assetId}`)
    }
    if (!Number.isFinite(value) || value < 0) continue
    out.push(pointCandle(time, value))
  }

  return ensureAscendingUnique(out)
}

interface AggregateBase {
  snap: GlobalSnapshot
  btcCaps: CapPoint[]
  ethCaps: CapPoint[]
  source: string
}

const aggregateBaseInflight = new Map<string, Promise<AggregateBase>>()
const aggregateBaseCache = new Map<string, { at: number; data: AggregateBase }>()

/**
 * Shared base for ALL aggregate charts (BTC.D / TOTAL / TOTAL2 / TOTAL3).
 * One global race + one BTC/ETH Binance pull — reused across the 4 widgets.
 * CoinGecko is skipped on the hot path (slow / rate-limited / max=401).
 */
async function getAggregateBase(timeframe: Timeframe): Promise<AggregateBase> {
  const key = timeframe
  const hit = aggregateBaseCache.get(key)
  if (hit && Date.now() - hit.at < CANDLE_MEM_TTL_MS) return hit.data

  const pending = aggregateBaseInflight.get(key)
  if (pending) return pending

  const promise = (async (): Promise<AggregateBase> => {
    const { interval, limit } = BINANCE_INTERVAL_MAP[timeframe]

    // Parallel: global snapshot + BTC/ETH klines (primary fast path)
    const [snap, btcRaw, ethRaw] = await Promise.all([
      fetchGlobalSnapshot(),
      fetchBinanceKlines('BTCUSDT', interval, limit),
      fetchBinanceKlines('ETHUSDT', interval, limit),
    ])

    const btc = parseBinanceKlines(btcRaw)
    const eth = parseBinanceKlines(ethRaw)
    if (!btc.length) throw new Error('Binance BTC klines empty')

    const btcPriceNow = btc[btc.length - 1].close
    const ethPriceNow = eth.length ? eth[eth.length - 1].close : 0
    const btcSupply = btcPriceNow > 0 ? snap.btcMarketCap / btcPriceNow : 0
    const ethSupply = ethPriceNow > 0 ? snap.ethMarketCap / ethPriceNow : 0

    const data: AggregateBase = {
      snap,
      btcCaps: btc.map((c) => ({ time: c.time, value: c.close * btcSupply })),
      ethCaps: eth.map((c) => ({
        time: c.time,
        value: ethSupply > 0 ? c.close * ethSupply : 0,
      })),
      source: `Binance + ${snap.source}`,
    }
    aggregateBaseCache.set(key, { at: Date.now(), data })
    return data
  })().finally(() => {
    aggregateBaseInflight.delete(key)
  })

  aggregateBaseInflight.set(key, promise)
  return promise
}

/**
 * Market-cap aggregates & dominance — Binance-first shared base (fast).
 */
async function fetchAggregateSeries(
  asset: AssetDefinition,
  timeframe: Timeframe,
): Promise<{ candles: Candle[]; source: string }> {
  if (!['btc-d', 'total', 'total2', 'total3'].includes(asset.id)) {
    throw new Error(`Unsupported aggregate ${asset.id}`)
  }

  // Hot path: shared Binance base (all 4 aggregate widgets share this)
  const base = await getAggregateBase(timeframe)
  const candles = buildAggregateCandles(
    asset.id,
    base.btcCaps,
    base.ethCaps,
    base.snap,
  )
  if (!candles.length) throw new Error('Empty aggregate series')
  return { candles, source: base.source }
}

/** Crypto Fear & Greed Index history (daily resolution from alternative.me). */
async function fetchFearGreedCandles(timeframe: Timeframe): Promise<Candle[]> {
  const limit = fearGreedLimit(timeframe)
  const url = `${FNG}/fng/?limit=${limit}&format=json`
  const data = await fetchJsonCached<{
    data?: Array<{
      value: string
      value_classification: string
      timestamp: string
    }>
  }>(url, 120_000, FAST_FETCH_TIMEOUT_MS)

  const rows = data.data
  if (!rows?.length) throw new Error('Fear & Greed empty')

  // API returns newest-first
  const candles = rows
    .map((r) => {
      const value = Number(r.value)
      const time = Number(r.timestamp)
      if (!Number.isFinite(value) || !Number.isFinite(time)) return null
      return pointCandle(time, value)
    })
    .filter((c): c is Candle => c != null)

  return ensureAscendingUnique(candles)
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface CandleResult {
  candles: Candle[]
  status: FeedStatus
}

/**
 * Fetch OHLC series with multi-tier failover + memory/IndexedDB cache.
 * Network-first so status stays "rest" when live feeds work; cache only on failure.
 */
export async function fetchCandles(
  assetId: string,
  timeframe: Timeframe,
): Promise<CandleResult> {
  const key = candleKey(assetId, timeframe)

  // Fresh memory hit — only reuse healthy live/rest results (never stick on "cached" offline flags)
  const mem = candleMemCache.get(key)
  if (
    mem &&
    Date.now() - mem.at < CANDLE_MEM_TTL_MS &&
    (mem.result.status.state === 'rest' || mem.result.status.state === 'live') &&
    mem.result.candles.length > 0
  ) {
    return mem.result
  }

  const inflight = candleInflight.get(key)
  if (inflight) return inflight

  const promise = fetchCandlesUncached(assetId, timeframe)
    .then((result) => {
      // Prefer storing successful live results; degraded cache is short-lived
      const ttlBoost =
        result.status.state === 'rest' || result.status.state === 'live' ? 1 : 0.25
      candleMemCache.set(key, {
        at: Date.now() - CANDLE_MEM_TTL_MS * (1 - ttlBoost),
        result,
      })
      candleInflight.delete(key)
      return result
    })
    .catch((err) => {
      candleInflight.delete(key)
      throw err
    })

  candleInflight.set(key, promise)
  return promise
}

async function fetchLiveCandles(
  asset: AssetDefinition,
  timeframe: Timeframe,
): Promise<{ candles: Candle[]; source: string }> {
  if (asset.id === 'fear-greed') {
    const candles = await fetchFearGreedCandles(timeframe)
    if (!candles.length) throw new Error('Fear & Greed empty')
    return { candles, source: 'alternative.me F&G' }
  }
  if (asset.category === 'equity') {
    return fetchEquityCandles(asset, timeframe)
  }
  if (asset.category === 'aggregate') {
    return fetchAggregateSeries(asset, timeframe)
  }
  // crypto + pairs
  try {
    const candles = await fetchBinanceCandles(asset, timeframe)
    if (!candles.length) throw new Error('Binance empty')
    return { candles, source: 'Binance REST' }
  } catch (binanceErr) {
    try {
      const candles = await fetchCryptoCompareCandles(asset, timeframe)
      if (!candles.length) throw new Error('CryptoCompare empty')
      return { candles, source: 'CryptoCompare' }
    } catch {
      throw binanceErr
    }
  }
}

async function fetchCandlesUncached(
  assetId: string,
  timeframe: Timeframe,
): Promise<CandleResult> {
  const asset = assetById(assetId)
  const errors: string[] = []

  // Load cache in parallel with live fetch (fallback only — does not short-circuit live)
  const cachePromise = loadCandles(assetId, timeframe)

  try {
    const { candles, source } = await fetchLiveCandles(asset, timeframe)
    if (candles.length) {
      void saveCandles(assetId, timeframe, candles, source)
      return {
        candles,
        status: {
          state: 'rest',
          source,
          lastUpdated: Date.now(),
        },
      }
    }
  } catch (e) {
    errors.push(String(e))
  }

  const cached = await cachePromise

  // Live failed — serve cache quietly if recent, with warning if stale
  if (cached?.candles?.length) {
    const ageMs = Date.now() - cached.savedAt
    const recent = ageMs < CANDLE_MEM_TTL_MS * 2
    return {
      candles: cached.candles,
      status: {
        state: 'cached',
        source: `Cache (${cached.source})`,
        lastUpdated: cached.savedAt,
        // Only show banner when cache is the fallback after a real live failure
        // and data is older than a couple of minutes
        message: recent
          ? undefined
          : `Live feed offline. Showing cached snapshot as of ${new Date(cached.savedAt).toLocaleString()}`,
      },
    }
  }

  const synthetic = generateSyntheticCandles(asset, timeframe)
  return {
    candles: synthetic,
    status: {
      state: 'offline',
      source: 'Synthetic seed',
      lastUpdated: Date.now(),
      message: `Live feed offline. Showing illustrative series (${errors[0] ?? 'no providers'}).`,
    },
  }
}

/** Latest quote for header / card metrics. */
export async function fetchQuote(assetId: string): Promise<AssetQuote> {
  const asset = assetById(assetId)

  try {
    if (asset.category === 'equity') {
      // Fetch 1D + 1Y in parallel so 52w range doesn't double latency
      const [daySeries, yearSeries] = await Promise.all([
        fetchEquityCandles(asset, '1D').then((r) => r.candles),
        fetchEquityCandles(asset, '1Y')
          .then((r) => r.candles)
          .catch(() => [] as Candle[]),
      ])
      const candles = daySeries.slice(-2)
      const last = candles[candles.length - 1]
      const prev = candles[candles.length - 2] ?? last
      const change = last.close - prev.close
      let high52w: number | undefined
      let low52w: number | undefined
      if (yearSeries.length) {
        high52w = Math.max(...yearSeries.map((c) => c.high))
        low52w = Math.min(...yearSeries.map((c) => c.low))
      }
      return {
        symbol: asset.symbol,
        price: last.close,
        change24h: change,
        changePercent24h: prev.close ? (change / prev.close) * 100 : 0,
        high52w,
        low52w,
        updatedAt: Date.now(),
      }
    }

    if (asset.binanceSymbol) {
      const path = `/api/v3/ticker/24hr?symbol=${asset.binanceSymbol}`
      type Ticker = {
        lastPrice: string
        priceChange: string
        priceChangePercent: string
        quoteVolume: string
        highPrice: string
        lowPrice: string
      }
      let t: Ticker
      try {
        t = await fetchJson<Ticker>(`${BINANCE_REST}${path}`)
      } catch {
        t = await fetchJson<Ticker>(`${BINANCE_REST_DIRECT}${path}`)
      }
      return {
        symbol: asset.symbol,
        price: Number(t.lastPrice),
        change24h: Number(t.priceChange),
        changePercent24h: Number(t.priceChangePercent),
        volume24h: Number(t.quoteVolume),
        updatedAt: Date.now(),
      }
    }

    if (asset.id === 'fear-greed') {
      const candles = await fetchFearGreedCandles('7D')
      const last = candles[candles.length - 1]
      const prev = candles[candles.length - 2] ?? last
      const change = last.close - prev.close
      return {
        symbol: asset.symbol,
        price: last.close,
        change24h: change,
        changePercent24h: prev.close ? (change / prev.close) * 100 : 0,
        updatedAt: Date.now(),
      }
    }

    if (asset.category === 'aggregate') {
      const d = await fetchGlobalSnapshot()
      if (asset.id === 'btc-d') {
        return {
          symbol: asset.symbol,
          price: d.btcDominance,
          change24h: 0,
          changePercent24h: 0,
          updatedAt: Date.now(),
        }
      }
      if (asset.id === 'total') {
        return {
          symbol: asset.symbol,
          price: d.totalMarketCap,
          change24h: 0,
          changePercent24h: d.marketCapChange24h,
          marketCap: d.totalMarketCap,
          volume24h: d.totalVolume24h,
          updatedAt: Date.now(),
        }
      }
      // TOTAL2 / TOTAL3 from live snapshot
      const price =
        asset.id === 'total2'
          ? Math.max(0, d.totalMarketCap - d.btcMarketCap)
          : Math.max(0, d.totalMarketCap - d.btcMarketCap - d.ethMarketCap)
      return {
        symbol: asset.symbol,
        price,
        change24h: 0,
        changePercent24h: d.marketCapChange24h,
        updatedAt: Date.now(),
      }
    }
  } catch {
    /* fall through */
  }

  // Fallback from candles
  const { candles } = await fetchCandles(assetId, '1D')
  const last = candles[candles.length - 1]
  const prev = candles[candles.length - 2] ?? last
  const change = last.close - prev.close
  return {
    symbol: asset.symbol,
    price: last.close,
    change24h: change,
    changePercent24h: prev.close ? (change / prev.close) * 100 : 0,
    updatedAt: Date.now(),
  }
}

/** Header tape: global cap, BTC.D, SPX, Fear & Greed. */
export async function fetchMarketOverview(): Promise<MarketOverview> {
  const empty: MarketOverview = {
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
    ethDominance: 0,
    spxPrice: 0,
    spxChangePercent: 0,
    fearGreed: 50,
    fearGreedLabel: 'Neutral',
    updatedAt: Date.now(),
  }

  const [globalRes, spxRes, fngRes] = await Promise.allSettled([
    fetchGlobalSnapshot(),
    fetchQuote('spx'),
    fetchJsonCached<{ data: Array<{ value: string; value_classification: string }> }>(
      `${FNG}/fng/?limit=1`,
    ),
  ])

  const overview = { ...empty }

  if (globalRes.status === 'fulfilled') {
    const d = globalRes.value
    overview.totalMarketCap = d.totalMarketCap
    overview.totalVolume24h = d.totalVolume24h
    overview.btcDominance = d.btcDominance
    overview.ethDominance = d.ethDominance
  }

  if (spxRes.status === 'fulfilled') {
    overview.spxPrice = spxRes.value.price
    overview.spxChangePercent = spxRes.value.changePercent24h
  }

  if (fngRes.status === 'fulfilled') {
    const row = fngRes.value.data?.[0]
    if (row) {
      overview.fearGreed = Number(row.value)
      overview.fearGreedLabel = row.value_classification
    }
  }

  overview.updatedAt = Date.now()
  return overview
}

// ─── WebSocket live ticks (Tier 1) ─────────────────────────────────────────

export type TickHandler = (payload: {
  symbol: string
  price: number
  time: number
}) => void

/**
 * Subscribe to Binance mini-ticker stream for USD + BTC pairs.
 * Returns an unsubscribe function.
 */
export function subscribeBinanceTicks(
  symbols: string[],
  onTick: TickHandler,
  onStatus?: (live: boolean) => void,
): () => void {
  if (!symbols.length || typeof WebSocket === 'undefined') {
    return () => undefined
  }

  const streams = symbols
    .map((s) => `${s.toLowerCase()}@miniTicker`)
    .join('/')
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`
  let ws: WebSocket | null = null
  let closed = false
  let retry = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    if (closed) return
    ws = new WebSocket(url)

    ws.onopen = () => {
      retry = 0
      onStatus?.(true)
    }

    ws.onmessage = (ev) => {
      try {
        if (typeof ev.data !== 'string' || ev.data.length > 50_000) return
        const msg = JSON.parse(ev.data) as {
          data?: { s?: unknown; c?: unknown; E?: unknown }
        }
        const d = msg.data
        if (!d || typeof d.s !== 'string' || typeof d.c !== 'string') return
        // Only symbols we subscribed to
        if (!symbols.includes(d.s)) return
        const price = Number(d.c)
        if (!Number.isFinite(price) || price <= 0) return
        const eventMs = typeof d.E === 'number' ? d.E : Date.now()
        onTick({
          symbol: d.s,
          price,
          time: Math.floor(eventMs / 1000),
        })
      } catch {
        /* ignore malformed */
      }
    }

    ws.onerror = () => {
      onStatus?.(false)
    }

    ws.onclose = () => {
      onStatus?.(false)
      if (closed) return
      const delay = Math.min(30_000, 1000 * 2 ** retry)
      retry += 1
      retryTimer = setTimeout(connect, delay)
    }
  }

  connect()

  return () => {
    closed = true
    if (retryTimer) clearTimeout(retryTimer)
    ws?.close()
  }
}

/** SMA helper for chart overlays. */
export function computeSMA(candles: Candle[], period: number): { time: number; value: number }[] {
  const out: { time: number; value: number }[] = []
  let sum = 0
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close
    if (i >= period) sum -= candles[i - period].close
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: sum / period })
    }
  }
  return out
}

export function formatPrice(value: number, unit?: string, isPercent?: boolean): string {
  if (isPercent || unit === '%') return `${value.toFixed(2)}%`
  if (unit === 'INDEX') {
    const n = Math.round(value)
    if (n <= 24) return `${n} · Extreme Fear`
    if (n <= 44) return `${n} · Fear`
    if (n <= 55) return `${n} · Neutral`
    if (n <= 74) return `${n} · Greed`
    return `${n} · Extreme Greed`
  }
  if (unit === 'BTC') {
    if (value < 0.0001) return value.toFixed(8)
    if (value < 0.01) return value.toFixed(6)
    return value.toFixed(5)
  }
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value)
  }
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(4)}`
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
