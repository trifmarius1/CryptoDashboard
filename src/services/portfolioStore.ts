/**
 * Portfolio persistence — LocalStorage (sync) + IndexedDB (durable backup).
 * No login required; JSON export/import for backup.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PortfolioHolding, PortfolioState } from '../types'

const LS_KEY = 'cryptomacro-portfolio-v1'
const DB_NAME = 'cryptomacro-portfolio'
const DB_VERSION = 1
const STORE = 'state'

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

function normalize(raw: unknown): PortfolioState {
  if (!raw || typeof raw !== 'object') return emptyState()
  const o = raw as Partial<PortfolioState>
  const holdings = Array.isArray(o.holdings)
    ? o.holdings
        .filter(
          (h): h is PortfolioHolding =>
            !!h &&
            typeof h === 'object' &&
            typeof (h as PortfolioHolding).id === 'string' &&
            typeof (h as PortfolioHolding).assetId === 'string' &&
            typeof (h as PortfolioHolding).amount === 'number' &&
            Number.isFinite((h as PortfolioHolding).amount) &&
            (h as PortfolioHolding).amount > 0,
        )
        .map((h) => ({
          id: h.id,
          assetId: h.assetId,
          amount: h.amount,
          avgBuyPriceUsd:
            typeof h.avgBuyPriceUsd === 'number' && Number.isFinite(h.avgBuyPriceUsd)
              ? h.avgBuyPriceUsd
              : undefined,
          addedAt: typeof h.addedAt === 'number' ? h.addedAt : Date.now(),
        }))
    : []
  return {
    version: 1,
    currency: o.currency === 'EUR' ? 'EUR' : 'USD',
    holdings,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : Date.now(),
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
