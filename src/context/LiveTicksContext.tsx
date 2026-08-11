import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAllAssets } from '../services/assetRegistry'
import { CUSTOM_CRYPTO_EVENT } from '../services/customCrypto'
import { subscribeBinanceTicks } from '../services/financialApi'

interface LiveTicksContextValue {
  prices: Record<string, number>
  wsLive: boolean
  getLivePrice: (assetId: string) => number | undefined
}

const LiveTicksContext = createContext<LiveTicksContextValue | null>(null)

function binanceSymbols(): string[] {
  return getAllAssets()
    .map((a) => a.binanceSymbol)
    .filter((s): s is string => Boolean(s))
}

/** Shared Binance WS subscription — resubscribes when custom coins change. */
export function LiveTicksProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [wsLive, setWsLive] = useState(false)
  const [symbolKey, setSymbolKey] = useState(() => binanceSymbols().join(','))

  useEffect(() => {
    const refresh = () => setSymbolKey(binanceSymbols().join(','))
    window.addEventListener(CUSTOM_CRYPTO_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CUSTOM_CRYPTO_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    const symbols = symbolKey ? symbolKey.split(',').filter(Boolean) : []
    if (!symbols.length) {
      setWsLive(false)
      return
    }
    return subscribeBinanceTicks(
      symbols,
      ({ symbol, price }) => {
        setPrices((prev) => {
          if (prev[symbol] === price) return prev
          return { ...prev, [symbol]: price }
        })
      },
      setWsLive,
    )
  }, [symbolKey])

  const value = useMemo<LiveTicksContextValue>(
    () => ({
      prices,
      wsLive,
      getLivePrice: (assetId: string) => {
        const asset = getAllAssets().find((a) => a.id === assetId)
        if (!asset?.binanceSymbol) return undefined
        return prices[asset.binanceSymbol]
      },
    }),
    [prices, wsLive],
  )

  return (
    <LiveTicksContext.Provider value={value}>{children}</LiveTicksContext.Provider>
  )
}

export function useLiveTicks(): LiveTicksContextValue {
  const ctx = useContext(LiveTicksContext)
  if (!ctx) {
    throw new Error('useLiveTicks must be used within LiveTicksProvider')
  }
  return ctx
}
