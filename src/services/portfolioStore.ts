/**
 * Portfolio persistence — LocalStorage (sync) + IndexedDB (durable backup).
 * No login required; JSON export/import for backup.
 * Input is strictly allow-listed to reduce XSS / prototype-pollution risk.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { ASSETS } from '../constants/assets'
import type { PortfolioHolding, PortfolioState } from '../types'

const LS_KEY = 'cryptomacro-portfolio-v1'
const DB_NAME = 'cryptomacro-portfolio'
const DB_VERSION = 1
const STORE = 'state'
const MAX_HOLDINGS = 50
const ALLOWED_ASSET_IDS = new Set(ASSETS.map((a) => a.id))

interface PortfolioDB extends DBSchema {
  state: {
    key: string
    value: PortfolioState
  }
}

const emptyState = (): PortfolioState => ({
  version: 1,
  currency: 'USD',
  holdings: [],
  updatedAt: Date.now(),
})

function safeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  // Alphanumeric + underscore/dash only, bounded length
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) return null
  return value
}

function normalize(raw: unknown): PortfolioState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyState()
  // Reject prototype-pollution payloads
  if (Object.prototype.hasOwnProperty.call(raw, '__proto__')) return emptyState()
  const o = raw as Record<string, unknown>
  const list = Array.isArray(o.holdings) ? o.holdings : []
  const holdings: PortfolioHolding[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    if (Object.prototype.hasOwnProperty.call(item, '__proto__')) continue
    const h = item as Record<string, unknown>
    const id = safeId(h.id)
    const assetId = safeId(h.assetId)
    const amount = typeof h.amount === 'number' ? h.amount : Number(h.amount)
    if (!id || !assetId || !ALLOWED_ASSET_IDS.has(assetId)) continue
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e15) continue
    let avgBuyPriceUsd: number | undefined
    if (h.avgBuyPriceUsd != null) {
      const avg = typeof h.avgBuyPriceUsd === 'number' ? h.avgBuyPriceUsd : Number(h.avgBuyPriceUsd)
      if (Number.isFinite(avg) && avg >= 0 && avg < 1e15) avgBuyPriceUsd = avg
    }
    const addedAt =
      typeof h.addedAt === 'number' && Number.isFinite(h.addedAt) ? h.addedAt : Date.now()
    holdings.push({ id, assetId, amount, avgBuyPriceUsd, addedAt })
    if (holdings.length >= MAX_HOLDINGS) break
  }
  return {
    version: 1,
    currency: o.currency === 'EUR' ? 'EUR' : 'USD',
    holdings,
    updatedAt:
      typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  }
}

let dbPromise: Promise<IDBPDatabase<PortfolioDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PortfolioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

/** Load portfolio — LocalStorage first, then IndexedDB. */
export async function loadPortfolio(): Promise<PortfolioState> {
  try {
    const ls = localStorage.getItem(LS_KEY)
    if (ls) {
      const state = normalize(JSON.parse(ls))
      // Mirror into IDB quietly
      void persistIdb(state)
      return state
    }
  } catch {
    /* fall through */
  }
  try {
    const db = await getDb()
    const row = await db.get(STORE, 'main')
    if (row) {
      const state = normalize(row)
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state))
      } catch {
        /* quota */
      }
      return state
    }
  } catch {
    /* empty */
  }
  return emptyState()
}

async function persistIdb(state: PortfolioState): Promise<void> {
  try {
    const db = await getDb()
    await db.put(STORE, state, 'main')
  } catch (err) {
    console.warn('[portfolio] idb save failed', err)
  }
}

/** Save to LocalStorage + IndexedDB. */
export async function savePortfolio(state: PortfolioState): Promise<void> {
  const next = { ...state, version: 1 as const, updatedAt: Date.now() }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch (err) {
    console.warn('[portfolio] localStorage save failed', err)
  }
  await persistIdb(next)
}

/** JSON backup for download. */
export function exportPortfolioJson(state: PortfolioState): string {
  return JSON.stringify(
    {
      ...state,
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'CryptoMacro Portfolio',
    },
    null,
    2,
  )
}

/** Parse imported JSON backup. */
export function importPortfolioJson(text: string): PortfolioState {
  const raw = JSON.parse(text) as unknown
  return normalize(raw)
}

export function newHoldingId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
