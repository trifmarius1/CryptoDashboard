/**
 * IndexedDB candle cache — stores the latest candles per asset+timeframe
 * for graceful offline / rate-limit failover (enough room for 4Y daily series).
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CacheEntry, Candle, Timeframe } from '../types'

const DB_NAME = 'cryptomacro-cache'
const DB_VERSION = 1
const STORE = 'candles'
const MAX_CANDLES = 1500

interface StoredEntry extends CacheEntry {
  key: string
}

interface CryptoMacroDB extends DBSchema {
  candles: {
    key: string
    value: StoredEntry
    indexes: { 'by-asset': string }
  }
}

let dbPromise: Promise<IDBPDatabase<CryptoMacroDB>> | null = null

function cacheKey(assetId: string, timeframe: Timeframe): string {
  return `${assetId}::${timeframe}`
}

function getDb(): Promise<IDBPDatabase<CryptoMacroDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CryptoMacroDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' })
          store.createIndex('by-asset', 'assetId')
        }
      },
    })
  }
  return dbPromise
}

/** Persist candles (trimmed to MAX_CANDLES newest). */
export async function saveCandles(
  assetId: string,
  timeframe: Timeframe,
  candles: Candle[],
  source: string,
): Promise<void> {
  try {
    const db = await getDb()
    const trimmed = candles.slice(-MAX_CANDLES)
    const entry: StoredEntry = {
      key: cacheKey(assetId, timeframe),
      assetId,
      timeframe,
      candles: trimmed,
      savedAt: Date.now(),
      source,
    }
    await db.put(STORE, entry)
  } catch (err) {
    console.warn('[cache] save failed', err)
  }
}

/** Load cached candles if present. */
export async function loadCandles(
  assetId: string,
  timeframe: Timeframe,
): Promise<CacheEntry | null> {
  try {
    const db = await getDb()
    const row = await db.get(STORE, cacheKey(assetId, timeframe))
    if (!row?.candles?.length) return null
    return {
      assetId: row.assetId,
      timeframe: row.timeframe,
      candles: row.candles,
      savedAt: row.savedAt,
      source: row.source,
    }
  } catch (err) {
    console.warn('[cache] load failed', err)
    return null
  }
}

/** Clear entire candle cache (settings / debug). */
export async function clearCache(): Promise<void> {
  try {
    const db = await getDb()
    await db.clear(STORE)
  } catch (err) {
    console.warn('[cache] clear failed', err)
  }
}
