import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { ASSETS } from '../constants/assets'
import { useLiveTicks } from './useLiveTicks'
import { fetchQuote } from '../services/financialApi'
import { getUsdToEurRate, convertUsd } from '../services/fxRates'
import {
  exportPortfolioJson,
  importPortfolioJson,
  loadPortfolio,
  newHoldingId,
  savePortfolio,
} from '../services/portfolioStore'
import type {
  AssetDefinition,
  PortfolioCurrency,
  PortfolioHolding,
  PortfolioState,
} from '../types'

/** Assets that can be held & valued in the portfolio. */
export const PORTFOLIO_ASSETS: AssetDefinition[] = ASSETS.filter(
  (a) =>
    a.category === 'crypto' ||
    a.category === 'equity' ||
    a.category === 'pair',
)

export interface HoldingValuation {
  holding: PortfolioHolding
  asset: AssetDefinition
  priceUsd: number
  changePercent24h: number
  valueUsd: number
  pnl24hUsd: number
  costBasisUsd?: number
  unrealizedPnlUsd?: number
  allocationPct: number
}

export interface PortfolioSummary {
  totalValueUsd: number
  totalPnl24hUsd: number
  totalPnl24hPct: number
  rows: HoldingValuation[]
  currency: PortfolioCurrency
  usdToEur: number
  fxSource: string
  offlineValuation: boolean
  wsLive: boolean
}

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState | null>(null)
  const [ready, setReady] = useState(false)
  const [fx, setFx] = useState({ usdToEur: 0.92, source: '…' })
  const { getLivePrice, wsLive } = useLiveTicks()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const s = await loadPortfolio()
      if (!cancelled) {
        setState(s)
        setReady(true)
      }
      try {
        const rate = await getUsdToEurRate()
        if (!cancelled) setFx({ usdToEur: rate.usdToEur, source: rate.source })
      } catch {
        /* keep default */
      }
    })()
    const fxTimer = window.setInterval(() => {
      void getUsdToEurRate().then((rate) =>
        setFx({ usdToEur: rate.usdToEur, source: rate.source }),
      )
    }, 15 * 60_000)
    return () => {
      cancelled = true
      clearInterval(fxTimer)
    }
  }, [])

  const persist = useCallback(async (next: PortfolioState) => {
    setState(next)
    await savePortfolio(next)
  }, [])

  const setCurrency = useCallback(
    (currency: PortfolioCurrency) => {
      if (!state) return
      void persist({ ...state, currency })
    },
    [state, persist],
  )

  const addHolding = useCallback(
    (assetId: string, amount: number, avgBuyPriceUsd?: number) => {
      if (!state || !(amount > 0)) return
      const existing = state.holdings.find((h) => h.assetId === assetId)
      let holdings: PortfolioHolding[]
      if (existing) {
        // Merge into same asset row
        const newAmt = existing.amount + amount
        let avg = existing.avgBuyPriceUsd
        if (avgBuyPriceUsd != null && avgBuyPriceUsd > 0) {
          if (avg != null && avg > 0) {
            avg = (avg * existing.amount + avgBuyPriceUsd * amount) / newAmt
          } else {
            avg = avgBuyPriceUsd
          }
        }
        holdings = state.holdings.map((h) =>
          h.id === existing.id
            ? { ...h, amount: newAmt, avgBuyPriceUsd: avg }
            : h,
        )
      } else {
        holdings = [
          ...state.holdings,
          {
            id: newHoldingId(),
            assetId,
            amount,
            avgBuyPriceUsd:
              avgBuyPriceUsd != null && avgBuyPriceUsd > 0
                ? avgBuyPriceUsd
                : undefined,
            addedAt: Date.now(),
          },
        ]
      }
      void persist({ ...state, holdings })
    },
    [state, persist],
  )

  const updateHolding = useCallback(
    (id: string, patch: Partial<Pick<PortfolioHolding, 'amount' | 'avgBuyPriceUsd'>>) => {
      if (!state) return
      const holdings = state.holdings
        .map((h) => {
          if (h.id !== id) return h
          const amount = patch.amount != null ? patch.amount : h.amount
          const avgBuyPriceUsd =
            patch.avgBuyPriceUsd !== undefined
              ? patch.avgBuyPriceUsd > 0
                ? patch.avgBuyPriceUsd
                : undefined
              : h.avgBuyPriceUsd
          return { ...h, amount, avgBuyPriceUsd }
        })
        .filter((h) => h.amount > 0)
      void persist({ ...state, holdings })
    },
    [state, persist],
  )

  const removeHolding = useCallback(
    (id: string) => {
      if (!state) return
      void persist({
        ...state,
        holdings: state.holdings.filter((h) => h.id !== id),
      })
    },
    [state, persist],
  )

  const clearAll = useCallback(() => {
    if (!state) return
    void persist({ ...state, holdings: [] })
  }, [state, persist])

  const exportJson = useCallback(() => {
    if (!state) return ''
    return exportPortfolioJson(state)
  }, [state])

  const importJson = useCallback(
    async (text: string) => {
      const next = importPortfolioJson(text)
      await persist(next)
    },
    [persist],
  )

  const assetIds = useMemo(
    () => [...new Set((state?.holdings ?? []).map((h) => h.assetId))],
    [state?.holdings],
  )

  const quoteQueries = useQueries({
    queries: assetIds.map((assetId) => ({
      queryKey: ['portfolio-quote', assetId],
      queryFn: () => fetchQuote(assetId),
      staleTime: 20_000,
      refetchInterval: 45_000,
      retry: 1,
    })),
  })

  const quotesById = useMemo(() => {
    const map = new Map<string, { price: number; changePercent24h: number }>()
    assetIds.forEach((id, i) => {
      const q = quoteQueries[i]?.data
      if (q) map.set(id, { price: q.price, changePercent24h: q.changePercent24h })
    })
    return map
  }, [assetIds, quoteQueries])

  const summary: PortfolioSummary | null = useMemo(() => {
    if (!state) return null
    let offline = !wsLive
    const raw: Omit<HoldingValuation, 'allocationPct'>[] = []

    for (const holding of state.holdings) {
      const asset = ASSETS.find((a) => a.id === holding.assetId)
      if (!asset) continue
      const live = getLivePrice(holding.assetId)
      const quote = quotesById.get(holding.assetId)
      let priceUsd = live ?? quote?.price ?? 0
      if (live == null && quote == null) offline = true
      if (!(priceUsd > 0) && quote?.price) priceUsd = quote.price
      const changePercent24h = quote?.changePercent24h ?? 0
      const valueUsd = holding.amount * priceUsd
      // Approx 24h P&L from percent change of current value
      const prevValue =
        changePercent24h !== 0
          ? valueUsd / (1 + changePercent24h / 100)
          : valueUsd
      const pnl24hUsd = valueUsd - prevValue
      const costBasisUsd =
        holding.avgBuyPriceUsd != null
          ? holding.amount * holding.avgBuyPriceUsd
          : undefined
      const unrealizedPnlUsd =
        costBasisUsd != null ? valueUsd - costBasisUsd : undefined

      raw.push({
        holding,
        asset,
        priceUsd,
        changePercent24h,
        valueUsd,
        pnl24hUsd,
        costBasisUsd,
        unrealizedPnlUsd,
      })
    }

    const totalValueUsd = raw.reduce((s, r) => s + r.valueUsd, 0)
    const totalPnl24hUsd = raw.reduce((s, r) => s + r.pnl24hUsd, 0)
    const totalPrev = totalValueUsd - totalPnl24hUsd
    const totalPnl24hPct = totalPrev > 0 ? (totalPnl24hUsd / totalPrev) * 100 : 0

    const rows: HoldingValuation[] = raw.map((r) => ({
      ...r,
      allocationPct: totalValueUsd > 0 ? (r.valueUsd / totalValueUsd) * 100 : 0,
    }))

    return {
      totalValueUsd,
      totalPnl24hUsd,
      totalPnl24hPct,
      rows,
      currency: state.currency,
      usdToEur: fx.usdToEur,
      fxSource: fx.source,
      offlineValuation: offline && raw.length > 0,
      wsLive,
    }
  }, [state, getLivePrice, quotesById, wsLive, fx])

  return {
    ready,
    state,
    summary,
    setCurrency,
    addHolding,
    updateHolding,
    removeHolding,
    clearAll,
    exportJson,
    importJson,
    convertUsd: (usd: number) =>
      convertUsd(usd, state?.currency ?? 'USD', fx.usdToEur),
    portfolioAssets: PORTFOLIO_ASSETS,
  }
}
