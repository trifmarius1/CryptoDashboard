/**
 * Unified asset lookup: core ASSETS + user-added custom crypto.
 */
import { ASSETS } from '../constants/assets'
import { loadCustomCrypto } from './customCrypto'
import type { AssetDefinition } from '../types'

/** All assets currently available in the app (core + custom). */
export function getAllAssets(): AssetDefinition[] {
  const custom = loadCustomCrypto()
  const coreIds = new Set(ASSETS.map((a) => a.id))
  return [...ASSETS, ...custom.filter((c) => !coreIds.has(c.id))]
}

export function getAssetById(id: string): AssetDefinition | undefined {
  return getAllAssets().find((a) => a.id === id)
}

export function getCryptoAssets(): AssetDefinition[] {
  return getAllAssets().filter((a) => a.category === 'crypto')
}

export function requireAssetById(id: string): AssetDefinition {
  const a = getAssetById(id)
  if (!a) throw new Error(`Unknown asset: ${id}`)
  return a
}
