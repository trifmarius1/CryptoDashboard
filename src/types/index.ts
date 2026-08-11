/** Shared domain types for the CryptoMacro dashboard. */

/** Chart lookback — hour / day / week / month / year granularities. */
export type Timeframe =
  | '1H'
  | '2H'
  | '3H'
  | '4H'
  | '5H'
  | '6H'
  | '7H'
  | '8H'
  | '1D'
  | '2D'
  | '3D'
  | '4D'
  | '5D'
  | '6D'
  | '7D'
  | '1W'
  | '2W'
  | '3W'
  | '4W'
  | '1M'
  | '2M'
  | '3M'
  | '4M'
  | '5M'
  | '6M'
  | '7M'
  | '8M'
  | '9M'
  | '10M'
  | '11M'
  | '12M'
  | '1Y'
  | '2Y'
  | '3Y'
  | '4Y'
  | 'ALL'

export type ChartKind = 'candlestick' | 'line' | 'area'

export type AssetCategory =
  | 'crypto'
  | 'equity'
  | 'aggregate'
  | 'pair'
  | 'macro'

/** OHLCV candle normalized for lightweight-charts (time in UTC seconds). */
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/** Lightweight-charts UTCTimestamp-compatible point. */
export interface LinePoint {
  time: number
  value: number
}

export interface AssetQuote {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  high52w?: number
  low52w?: number
  marketCap?: number
  volume24h?: number
  updatedAt: number
}

export interface AssetDefinition {
  id: string
  symbol: string
  name: string
  category: AssetCategory
  /** Binance symbol when applicable (e.g. BTCUSDT). */
  binanceSymbol?: string
  /** CoinGecko id when applicable. */
  coingeckoId?: string
  /** Yahoo Finance ticker when applicable. */
  yahooSymbol?: string
  /** Display as percentage (BTC.D). */
  isPercent?: boolean
  /** Prefer line chart over candles (market-cap aggregates). */
  preferLine?: boolean
  /** Unit prefix for axis labels. */
  unit?: 'USD' | 'BTC' | '%' | 'INDEX'
  description?: string
}

export type ConnectionState = 'live' | 'rest' | 'cached' | 'offline'

export interface FeedStatus {
  state: ConnectionState
  source: string
  lastUpdated: number | null
  message?: string
}

export interface MarketOverview {
  totalMarketCap: number
  totalVolume24h: number
  btcDominance: number
  ethDominance: number
  spxPrice: number
  spxChangePercent: number
  fearGreed: number
  fearGreedLabel: string
  updatedAt: number
}

export interface ShemitahBand {
  /** Gregorian year the Shemitah year ends (Elul 29). */
  endYear: number
  /** Approximate start of sabbatical year (Tishrei prior year). */
  startDate: Date
  /** End of sabbatical year (Elul 29). */
  endDate: Date
  label: string
  /** Major historical market events near this cycle. */
  events: ShemitahEvent[]
}

export interface ShemitahEvent {
  year: number
  title: string
  description: string
  /** 'crash' | 'correction' | 'tightening' | 'projected' */
  severity: 'crash' | 'correction' | 'tightening' | 'projected'
}

export interface ShemitahStats {
  sabbaticalAvgReturn: number
  expansionAvgReturn: number
  sabbaticalWinRate: number
  expansionWinRate: number
  sabbaticalAvgDrawdown: number
  expansionAvgDrawdown: number
  nextCycleWindow: string
  currentPhase: 'shemitah' | 'expansion' | 'approaching'
  yearsToNext: number
}

export type NavSection = 'dashboard' | 'macro' | 'portfolio' | 'shemitah'

/** Single portfolio lot — amount held of a site asset. */
export interface PortfolioHolding {
  id: string
  assetId: string
  /** Quantity held (coins / shares). */
  amount: number
  /** Optional average cost basis in USD per unit. */
  avgBuyPriceUsd?: number
  addedAt: number
}

export type PortfolioCurrency = 'USD' | 'EUR'

export interface PortfolioState {
  version: 1
  currency: PortfolioCurrency
  holdings: PortfolioHolding[]
  updatedAt: number
}

export interface CacheEntry {
  assetId: string
  timeframe: Timeframe
  candles: Candle[]
  savedAt: number
  source: string
}
