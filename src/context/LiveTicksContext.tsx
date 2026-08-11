import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ASSETS } from '../constants/assets'
import { subscribeBinanceTicks } from '../services/financialApi'

interface LiveTicksContextValue {
  prices: Record<string, number>
  wsLive: boolean
  getLivePrice: (assetId: string) => number | undefined
}

const LiveTicksContext = createContext<LiveTicksContextValue | null>(null)

/** Single shared Binance WS subscription for the whole app. */
export function LiveTicksProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [wsLive, setWsLive] = useState(false)

  useEffect(() => {
    const symbols = ASSETS.map((a) => a.binanceSymbol).filter(
      (s): s is string => Boolean(s),
    )
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
  }, [])

  const value = useMemo<LiveTicksContextValue>(
    () => ({
      prices,
      wsLive,
      getLivePrice: (assetId: string) => {
        const asset = ASSETS.find((a) => a.id === assetId)
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
