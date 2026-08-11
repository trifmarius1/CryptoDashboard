import { useCallback, useEffect, useState } from 'react'
import type { AssetDefinition } from '../types'
import {
  addCustomCrypto,
  CUSTOM_CRYPTO_EVENT,
  fetchBinanceUsdtCatalog,
  loadCustomCrypto,
  removeCustomCrypto,
  type BinanceUsdtCoin,
} from '../services/customCrypto'

export function useCustomCrypto() {
  const [custom, setCustom] = useState<AssetDefinition[]>(() => loadCustomCrypto())

  const refresh = useCallback(() => {
    setCustom(loadCustomCrypto())
  }, [])

  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener(CUSTOM_CRYPTO_EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(CUSTOM_CRYPTO_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [refresh])

  const add = useCallback((coin: BinanceUsdtCoin) => {
    const next = addCustomCrypto(coin)
    setCustom(next)
    return next
  }, [])

  const remove = useCallback((assetId: string) => {
    const next = removeCustomCrypto(assetId)
    setCustom(next)
    return next
  }, [])

  return { custom, add, remove, refresh, fetchCatalog: fetchBinanceUsdtCatalog }
}
