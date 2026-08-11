/**
 * USD ↔ EUR conversion — Frankfurter (ECB) primary, CoinGecko backup.
 * Rates cached in memory + localStorage for offline valuation.
 */
const LS_KEY = 'cryptomacro-fx-usd-eur'
const MEM_TTL_MS = 30 * 60_000

interface FxCache {
  usdToEur: number
  at: number
  source: string
}

let mem: FxCache | null = null

function readLs(): FxCache | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as FxCache
    if (typeof o.usdToEur === 'number' && o.usdToEur > 0) return o
  } catch {
    /* ignore */
  }
  return null
}

function writeLs(c: FxCache) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

async function fetchFrankfurter(): Promise<FxCache> {
  const res = await fetch('/api/fx/latest?from=USD&to=EUR', {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`)
  const data = (await res.json()) as { rates?: { EUR?: number } }
  const rate = data.rates?.EUR
  if (!rate || rate <= 0) throw new Error('FX empty')
  return { usdToEur: rate, at: Date.now(), source: 'ECB (Frankfurter)' }
}

async function fetchCoinGeckoFx(): Promise<FxCache> {
  const res = await fetch(
    '/api/coingecko/api/v3/simple/price?ids=tether&vs_currencies=usd,eur',
    { headers: { Accept: 'application/json' } },
  )
  if (!res.ok) throw new Error(`CG FX HTTP ${res.status}`)
  const data = (await res.json()) as { tether?: { usd?: number; eur?: number } }
  const usd = data.tether?.usd ?? 1
  const eur = data.tether?.eur
  if (!eur || eur <= 0) throw new Error('CG FX empty')
  // EUR per 1 USD ≈ eur/usd when tether≈1 USD
  const usdToEur = eur / usd
  return { usdToEur, at: Date.now(), source: 'CoinGecko' }
}

/** Live USD→EUR rate (EUR per 1 USD). */
export async function getUsdToEurRate(): Promise<FxCache> {
  if (mem && Date.now() - mem.at < MEM_TTL_MS) return mem

  try {
    mem = await fetchFrankfurter()
    writeLs(mem)
    return mem
  } catch {
    /* try backup */
  }
  try {
    mem = await fetchCoinGeckoFx()
    writeLs(mem)
    return mem
  } catch {
    /* offline */
  }

  const ls = readLs()
  if (ls) {
    mem = ls
    return { ...ls, source: `Cached (${ls.source})` }
  }

  // Reasonable fallback
  mem = { usdToEur: 0.92, at: Date.now(), source: 'Fallback estimate' }
  return mem
}

export function convertUsd(amountUsd: number, currency: 'USD' | 'EUR', usdToEur: number): number {
  if (currency === 'USD') return amountUsd
  return amountUsd * usdToEur
}

export function formatFiat(
  amountUsd: number,
  currency: 'USD' | 'EUR',
  usdToEur: number,
  opts?: { signed?: boolean; compact?: boolean },
): string {
  const v = convertUsd(amountUsd, currency, usdToEur)
  const abs = Math.abs(v)
  const sign = opts?.signed ? (v > 0 ? '+' : v < 0 ? '−' : '') : v < 0 ? '−' : ''
  const n = abs
  let body: string
  if (opts?.compact) {
    if (n >= 1e9) body = `${(n / 1e9).toFixed(2)}B`
    else if (n >= 1e6) body = `${(n / 1e6).toFixed(2)}M`
    else if (n >= 1e3) body = `${(n / 1e3).toFixed(2)}K`
    else body = n.toFixed(2)
  } else {
    body = n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  const sym = currency === 'EUR' ? '€' : '$'
  return `${sign}${sym}${body}`
}
