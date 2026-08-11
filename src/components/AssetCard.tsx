import { useMemo, useState } from 'react'
import type { AssetDefinition, Timeframe } from '../types'
import { useAssetQuote, useChartData } from '../hooks/useChartData'
import { useLiveTicks } from '../hooks/useLiveTicks'
import { formatPrice } from '../services/financialApi'
import { FearGreedPie } from './FearGreedPie'
import { InteractiveChart } from './InteractiveChart'
import { MetricBadge } from './MetricBadge'
import { OfflineBanner } from './OfflineBanner'

interface Props {
  asset: AssetDefinition
  defaultTimeframe?: Timeframe
  shemitahCapable?: boolean
  compact?: boolean
  /** Optional DOM id suffix to avoid duplicate ids when the same asset is rendered twice. */
  idSuffix?: string
}

export function AssetCard({
  asset,
  defaultTimeframe = '1Y',
  shemitahCapable = false,
  compact = false,
  idSuffix = '',
}: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe)
  const [shemitahOn, setShemitahOn] = useState(false)
  const { data, isLoading, isFetching } = useChartData(asset.id, timeframe)
  const { data: quote } = useAssetQuote(asset.id)
  const { getLivePrice, wsLive } = useLiveTicks()

  const live = getLivePrice(asset.id)
  const price = live ?? quote?.price ?? data?.candles.at(-1)?.close ?? 0
  const changePct = quote?.changePercent24h ?? 0

  const priceLabel = useMemo(
    () => formatPrice(price, asset.unit, asset.isPercent),
    [price, asset.unit, asset.isPercent],
  )

  return (
    <article
      id={`asset-${asset.id}${idSuffix ? `-${idSuffix}` : ''}`}
      className="card-lift @container rounded-2xl border border-border/70 bg-surface-card/90 p-3 shadow-card backdrop-blur-md sm:p-4"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 420px' }}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
              {asset.name}
            </h3>
            <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] font-medium text-muted sm:text-xs">
              {asset.symbol}
            </span>
            {wsLive && asset.binanceSymbol && (
              <span className="hidden rounded-full bg-bullish/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bullish sm:inline">
                WS
              </span>
            )}
          </div>
          {asset.description && (
            <p className="mt-0.5 max-w-prose text-xs text-muted sm:text-[13px]">
              {asset.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-xl font-bold tabular-nums tracking-tight text-slate-50 sm:text-2xl">
            {priceLabel}
          </span>
          <MetricBadge value={changePct} />
        </div>
      </header>

      {/* Equity extras: 52-week range */}
      {asset.category === 'equity' && quote?.high52w != null && quote.low52w != null && (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-elevated/60 p-2.5 text-xs sm:text-sm">
          <div>
            <div className="text-muted">52-Week High</div>
            <div className="font-mono font-semibold tabular-nums text-bullish">
              {formatPrice(quote.high52w)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted">52-Week Low</div>
            <div className="font-mono font-semibold tabular-nums text-bearish">
              {formatPrice(quote.low52w)}
            </div>
          </div>
        </div>
      )}

      <OfflineBanner status={data?.status} className="mb-2" />

      {asset.id === 'fear-greed' ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-stretch">
          <InteractiveChart
            candles={data?.candles ?? []}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            preferLine={asset.preferLine}
            isPercent={asset.isPercent}
            unit={asset.unit}
            showVolume={false}
            showSMA={false}
            height={compact ? 280 : 340}
            loading={isLoading || (isFetching && !data)}
            className="min-w-0"
          />
          <FearGreedPie value={price} size={compact ? 200 : 230} />
        </div>
      ) : (
        <InteractiveChart
          candles={data?.candles ?? []}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          preferLine={asset.preferLine}
          isPercent={asset.isPercent}
          unit={asset.unit}
          showVolume={!asset.preferLine}
          showSMA={!asset.preferLine}
          shemitahOverlay={shemitahCapable}
          shemitahEnabled={shemitahOn}
          onToggleShemitah={setShemitahOn}
          height={compact ? 260 : 320}
          loading={isLoading || (isFetching && !data)}
        />
      )}
    </article>
  )
}
