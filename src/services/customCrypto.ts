/**
 * User-added crypto assets (any Binance USDT spot pair).
 * Persisted in LocalStorage — full chart parity with core crypto cards.
 */
import type { AssetDefinition } from '../types'
import { ASSETS } from '../constants/assets'

const LS_KEY = 'cryptomacro-custom-crypto-v1'
const MAX_CUSTOM = 40

/** Browser event when user-added coins change (LiveTicks resubscribe). */
export const CUSTOM_CRYPTO_EVENT = 'cryptomacro-custom-crypto-changed'

export function emitCustomCryptoChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CUSTOM_CRYPTO_EVENT))
  }
}

export interface BinanceUsdtCoin {
  baseAsset: string
  binanceSymbol: string
  name: string
}

function baseUrl(): string {
  return import.meta.env.DEV ? '/api/binance' : 'https://api.binance.com'
}

/** Map base asset → AssetDefinition for the dashboard. */
export function coinToAsset(coin: BinanceUsdtCoin): AssetDefinition {
  const base = coin.baseAsset.toUpperCase()
  return {
    id: `crypto-${base.toLowerCase()}-usd`,
    symbol: `${base}/USD`,
    name: coin.name || base,
    category: 'crypto',
    binanceSymbol: coin.binanceSymbol,
    unit: 'USD',
    description: `User-added · ${coin.binanceSymbol} on Binance`,
  }
}

export function isCoreCryptoId(id: string): boolean {
  return ASSETS.some((a) => a.category === 'crypto' && a.id === id)
}

export function loadCustomCrypto(): AssetDefinition[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter(
        (a): a is AssetDefinition =>
          !!a &&
          typeof a === 'object' &&
          typeof (a as AssetDefinition).id === 'string' &&
          typeof (a as AssetDefinition).binanceSymbol === 'string' &&
          (a as AssetDefinition).category === 'crypto',
      )
      .slice(0, MAX_CUSTOM)
      .map((a) => ({
        id: a.id,
        symbol: a.symbol || a.id,
        name: a.name || a.symbol,
        category: 'crypto' as const,
        binanceSymbol: a.binanceSymbol,
        coingeckoId: a.coingeckoId,
        unit: 'USD' as const,
        description: a.description,
      }))
  } catch {
    return []
  }
}

export function saveCustomCrypto(assets: AssetDefinition[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(assets.slice(0, MAX_CUSTOM)))
  } catch (e) {
    console.warn('[customCrypto] save failed', e)
  }
}

export function addCustomCrypto(coin: BinanceUsdtCoin): AssetDefinition[] {
  const asset = coinToAsset(coin)
  const current = loadCustomCrypto()
  if (isCoreCryptoId(asset.id)) return current
  if (current.some((a) => a.id === asset.id || a.binanceSymbol === asset.binanceSymbol)) {
    return current
  }
  const next = [...current, asset].slice(0, MAX_CUSTOM)
  saveCustomCrypto(next)
  emitCustomCryptoChanged()
  return next
}

export function removeCustomCrypto(assetId: string): AssetDefinition[] {
  const next = loadCustomCrypto().filter((a) => a.id !== assetId)
  saveCustomCrypto(next)
  emitCustomCryptoChanged()
  return next
}

let catalogCache: BinanceUsdtCoin[] | null = null
let catalogAt = 0
const CATALOG_TTL = 30 * 60_000

/**
 * Full Binance USDT spot catalog (all tradable quote pairs).
 * Cached in memory for 30 minutes.
 */
export async function fetchBinanceUsdtCatalog(): Promise<BinanceUsdtCoin[]> {
  if (catalogCache && Date.now() - catalogAt < CATALOG_TTL) return catalogCache

  const res = await fetch(`${baseUrl()}/api/v3/exchangeInfo`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Binance exchangeInfo HTTP ${res.status}`)
  const data = (await res.json()) as {
    symbols?: Array<{
      symbol: string
      status: string
      baseAsset: string
      quoteAsset: string
      isSpotTradingAllowed?: boolean
    }>
  }

  const list: BinanceUsdtCoin[] = []
  for (const s of data.symbols ?? []) {
    if (s.quoteAsset !== 'USDT') continue
    if (s.status !== 'TRADING') continue
    if (s.isSpotTradingAllowed === false) continue
    // Skip leveraged tokens noise when possible
    const base = s.baseAsset
    if (/UP$|DOWN$|BULL$|BEAR$/i.test(base)) continue
    list.push({
      baseAsset: base,
      binanceSymbol: s.symbol,
      name: base,
    })
  }
  list.sort((a, b) => a.baseAsset.localeCompare(b.baseAsset))
  catalogCache = list
  catalogAt = Date.now()
  return list
}
