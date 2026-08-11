import type { AssetDefinition, Timeframe } from '../types'

/**
 * Strict vertical/grid sequence required by product spec.
 * Order of this array drives dashboard render order.
 */
export const ASSETS: AssetDefinition[] = [
  // ── A. Single crypto assets (USD pairs) ──────────────────────────
  {
    id: 'btc-usd',
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    category: 'crypto',
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    unit: 'USD',
    description: 'Primary crypto reserve asset',
  },
  {
    id: 'eth-usd',
    symbol: 'ETH/USD',
    name: 'Ethereum',
    category: 'crypto',
    binanceSymbol: 'ETHUSDT',
    coingeckoId: 'ethereum',
    unit: 'USD',
  },
  {
    id: 'sol-usd',
    symbol: 'SOL/USD',
    name: 'Solana',
    category: 'crypto',
    binanceSymbol: 'SOLUSDT',
    coingeckoId: 'solana',
    unit: 'USD',
  },
  {
    id: 'ada-usd',
    symbol: 'ADA/USD',
    name: 'Cardano',
    category: 'crypto',
    binanceSymbol: 'ADAUSDT',
    coingeckoId: 'cardano',
    unit: 'USD',
  },

  // ── B. Traditional financial benchmarks ──────────────────────────
  {
    id: 'spx',
    symbol: 'SPX',
    name: 'S&P 500 Index',
    category: 'equity',
    yahooSymbol: '^GSPC',
    unit: 'USD',
    description:
      'Equity risk-on benchmark for crypto correlation comparison (SPY/SPX)',
  },

  // ── C. Market-cap aggregates & dominance ─────────────────────────
  {
    id: 'btc-d',
    symbol: 'BTC.D',
    name: 'BTC Dominance',
    category: 'aggregate',
    isPercent: true,
    preferLine: true,
    unit: '%',
    description: 'Bitcoin share of total crypto market cap',
  },
  {
    id: 'total',
    symbol: 'TOTAL',
    name: 'Total Crypto Market Cap',
    category: 'aggregate',
    preferLine: true,
    unit: 'USD',
    description: 'Aggregate market capitalization of all cryptocurrencies',
  },
  {
    id: 'total2',
    symbol: 'TOTAL2',
    name: 'TOTAL2 (ex-BTC)',
    category: 'aggregate',
    preferLine: true,
    unit: 'USD',
    description: 'Total market cap excluding Bitcoin',
  },
  {
    id: 'total3',
    symbol: 'TOTAL3',
    name: 'TOTAL3 (ex-BTC & ETH)',
    category: 'aggregate',
    preferLine: true,
    unit: 'USD',
    description: 'Total market cap excluding Bitcoin and Ethereum',
  },

  // ── D. Bitcoin trading pairs ─────────────────────────────────────
  {
    id: 'eth-btc',
    symbol: 'ETH/BTC',
    name: 'Ethereum / Bitcoin',
    category: 'pair',
    binanceSymbol: 'ETHBTC',
    unit: 'BTC',
  },
  {
    id: 'sol-btc',
    symbol: 'SOL/BTC',
    name: 'Solana / Bitcoin',
    category: 'pair',
    binanceSymbol: 'SOLBTC',
    unit: 'BTC',
  },
  {
    id: 'ada-btc',
    symbol: 'ADA/BTC',
    name: 'Cardano / Bitcoin',
    category: 'pair',
    binanceSymbol: 'ADABTC',
    unit: 'BTC',
  },

  // ── E. Industry sentiment ────────────────────────────────────────
  {
    id: 'fear-greed',
    symbol: 'F&G',
    name: 'Crypto Fear & Greed Index',
    category: 'macro',
    preferLine: true,
    unit: 'INDEX',
    description:
      'Industry-wide crypto sentiment gauge (0 extreme fear → 100 extreme greed)',
  },
]

/** Timeframe unit groups for the chart selector UI. */
export type TimeframeUnit = 'H' | 'D' | 'W' | 'M' | 'Y' | 'ALL'

export const TIMEFRAME_GROUPS: {
  unit: TimeframeUnit
  label: string
  options: { id: Timeframe; label: string }[]
}[] = [
  {
    unit: 'H',
    label: 'Hours',
    options: [
      { id: '1H', label: '1' },
      { id: '2H', label: '2' },
      { id: '3H', label: '3' },
      { id: '4H', label: '4' },
      { id: '5H', label: '5' },
      { id: '6H', label: '6' },
      { id: '7H', label: '7' },
      { id: '8H', label: '8' },
    ],
  },
  {
    unit: 'D',
    label: 'Days',
    options: [
      { id: '1D', label: '1' },
      { id: '2D', label: '2' },
      { id: '3D', label: '3' },
      { id: '4D', label: '4' },
      { id: '5D', label: '5' },
      { id: '6D', label: '6' },
      { id: '7D', label: '7' },
    ],
  },
  {
    unit: 'W',
    label: 'Weeks',
    options: [
      { id: '1W', label: '1' },
      { id: '2W', label: '2' },
      { id: '3W', label: '3' },
      { id: '4W', label: '4' },
    ],
  },
  {
    unit: 'M',
    label: 'Months',
    // Full calendar year: 1–12 months
    options: Array.from({ length: 12 }, (_, i) => {
      const n = i + 1
      return { id: `${n}M` as Timeframe, label: String(n) }
    }),
  },
  {
    unit: 'Y',
    label: 'Years',
    options: [
      { id: '1Y', label: '1' },
      { id: '2Y', label: '2' },
      { id: '3Y', label: '3' },
      { id: '4Y', label: '4' },
    ],
  },
  {
    unit: 'ALL',
    label: 'All',
    options: [{ id: 'ALL', label: 'ALL' }],
  },
]

/** Flat list (all selectable timeframes). */
export const TIMEFRAMES: { id: Timeframe; label: string }[] =
  TIMEFRAME_GROUPS.flatMap((g) =>
    g.options.map((o) => ({
      id: o.id,
      label: g.unit === 'ALL' ? 'ALL' : `${o.label}${g.unit === 'M' ? 'M' : g.unit}`,
    })),
  )

export function parseTimeframe(tf: Timeframe): {
  unit: TimeframeUnit
  n: number
} {
  if (tf === 'ALL') return { unit: 'ALL', n: 0 }
  const m = tf.match(/^(\d+)([HDWMY])$/)
  if (!m) return { unit: 'D', n: 1 }
  return { unit: m[2] as TimeframeUnit, n: Number(m[1]) }
}

export function timeframeUnit(tf: Timeframe): TimeframeUnit {
  return parseTimeframe(tf).unit
}

/** Binance kline interval + limit — built so every H/D/W/Y option is covered. */
function buildBinanceMap(): Record<Timeframe, { interval: string; limit: number }> {
  const map = {} as Record<Timeframe, { interval: string; limit: number }>

  // Hours: 1m bars
  for (let h = 1; h <= 8; h++) {
    map[`${h}H` as Timeframe] = { interval: '1m', limit: h * 60 }
  }
  // Days: 1D uses 15m; multi-day uses 1h
  map['1D'] = { interval: '15m', limit: 96 }
  for (let d = 2; d <= 7; d++) {
    map[`${d}D` as Timeframe] = { interval: '1h', limit: d * 24 }
  }
  // Weeks: 4h bars
  for (let w = 1; w <= 4; w++) {
    map[`${w}W` as Timeframe] = { interval: '4h', limit: w * 42 }
  }
  // Months: daily bars (~30.4 days each) — full year = 12 options
  for (let m = 1; m <= 12; m++) {
    map[`${m}M` as Timeframe] = {
      interval: '1d',
      limit: Math.min(Math.round(m * 30.44), 370),
    }
  }
  // Years — stay ≤1000 bars (no pagination)
  map['1Y'] = { interval: '1d', limit: 365 }
  map['2Y'] = { interval: '1d', limit: 730 }
  map['3Y'] = { interval: '3d', limit: 400 }
  map['4Y'] = { interval: '1w', limit: 220 }
  map.ALL = { interval: '1w', limit: 500 }

  return map
}

export const BINANCE_INTERVAL_MAP = buildBinanceMap()

/** Yahoo chart range/interval mapping for SPX. */
function buildYahooMap(): Record<Timeframe, { range: string; interval: string }> {
  const map = {} as Record<Timeframe, { range: string; interval: string }>

  for (let h = 1; h <= 8; h++) {
    map[`${h}H` as Timeframe] = { range: '1d', interval: '1m' }
  }
  map['1D'] = { range: '5d', interval: '15m' }
  for (let d = 2; d <= 5; d++) {
    map[`${d}D` as Timeframe] = { range: '5d', interval: '30m' }
  }
  map['6D'] = { range: '1mo', interval: '1h' }
  map['7D'] = { range: '1mo', interval: '1h' }
  for (let w = 1; w <= 4; w++) {
    map[`${w}W` as Timeframe] = {
      range: w <= 2 ? '1mo' : '3mo',
      interval: '1h',
    }
  }
  // Months — Yahoo ranges, trim client-side to exact N months (1–12)
  for (let m = 1; m <= 12; m++) {
    const range = m <= 3 ? '3mo' : m <= 6 ? '6mo' : '1y'
    map[`${m}M` as Timeframe] = { range, interval: '1d' }
  }
  map['1Y'] = { range: '1y', interval: '1d' }
  map['2Y'] = { range: '2y', interval: '1d' }
  map['3Y'] = { range: '5y', interval: '1d' }
  map['4Y'] = { range: '5y', interval: '1d' }
  map.ALL = { range: 'max', interval: '1wk' }

  return map
}

export const YAHOO_RANGE_MAP = buildYahooMap()

/** Approximate lookback in seconds for client-side trimming. */
export const TIMEFRAME_LOOKBACK_SEC: Partial<Record<Timeframe, number>> = (() => {
  const out: Partial<Record<Timeframe, number>> = {}
  for (let h = 1; h <= 8; h++) out[`${h}H` as Timeframe] = h * 3600
  for (let d = 1; d <= 7; d++) out[`${d}D` as Timeframe] = d * 86_400
  for (let w = 1; w <= 4; w++) out[`${w}W` as Timeframe] = w * 7 * 86_400
  for (let m = 1; m <= 12; m++) out[`${m}M` as Timeframe] = m * 30.44 * 86_400
  out['1Y'] = 365.25 * 86_400
  out['2Y'] = 2 * 365.25 * 86_400
  out['3Y'] = 3 * 365.25 * 86_400
  out['4Y'] = 4 * 365.25 * 86_400
  return out
})()

/** How many daily F&G points to request for a timeframe. */
export function fearGreedLimit(tf: Timeframe): number {
  const { unit, n } = parseTimeframe(tf)
  switch (unit) {
    case 'H':
      return 2 // daily index — show recent days
    case 'D':
      return Math.max(2, n)
    case 'W':
      return n * 7
    case 'M':
      return Math.max(2, Math.round(n * 30.44))
    case 'Y':
      return Math.min(n * 365, 2000)
    case 'ALL':
      return 0 // API: 0 = full history
    default:
      return 30
  }
}

export const SECTION_META = {
  crypto: {
    title: 'Single Crypto Assets',
    subtitle: 'USD pairs — real-time & historical',
  },
  equity: {
    title: 'Traditional Benchmarks',
    subtitle: 'Equity risk-on correlation reference',
  },
  aggregate: {
    title: 'Market Cap Aggregates & Dominance',
    subtitle: 'TOTAL · TOTAL2 · TOTAL3 · BTC.D',
  },
  pair: {
    title: 'Bitcoin Trading Pairs',
    subtitle: 'Relative strength vs BTC',
  },
  macro: {
    title: 'Industry Sentiment',
    subtitle: 'Crypto Fear & Greed Index',
  },
} as const

export const COLORS = {
  surface: '#060912',
  surfaceElevated: '#0C1220',
  surfaceCard: '#10182A',
  border: '#243049',
  bullish: '#34D399',
  bearish: '#FB7185',
  amber: '#FBBF24',
  accent: '#2DD4BF',
  muted: '#8B9BB4',
  text: '#E8EEF8',
} as const
