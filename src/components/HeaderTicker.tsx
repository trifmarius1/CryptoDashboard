import type { ReactNode } from 'react'
import { useMarketOverview } from '../hooks/useMarketOverview'
import { formatPrice } from '../services/financialApi'
import { MetricBadge } from './MetricBadge'

function TickerChip({
  label,
  value,
  change,
  icon,
  tone = 'default',
}: {
  label: string
  value: string
  change?: number
  icon: ReactNode
  tone?: 'default' | 'accent' | 'amber' | 'sky'
}) {
  const toneRing =
    tone === 'accent'
      ? 'ring-accent/20 bg-accent/[0.06]'
      : tone === 'amber'
        ? 'ring-amber/20 bg-amber/[0.06]'
        : tone === 'sky'
          ? 'ring-sky-400/20 bg-sky-400/[0.06]'
          : 'ring-border/50 bg-white/[0.03]'

  const iconTone =
    tone === 'accent'
      ? 'bg-accent/15 text-accent'
      : tone === 'amber'
        ? 'bg-amber/15 text-amber'
        : tone === 'sky'
          ? 'bg-sky-400/15 text-sky-300'
          : 'bg-white/[0.05] text-muted'

  return (
    <div
      className={`pressable flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 ring-1 transition-all duration-300 hover:brightness-110 ${toneRing}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          {label}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-semibold tabular-nums tracking-tight text-slate-50 sm:text-[15px]">
            {value}
          </span>
          {typeof change === 'number' && (
            <MetricBadge value={change} className="min-h-0 px-1.5 py-0 text-[10px]" />
          )}
        </div>
      </div>
    </div>
  )
}

/** Real-time market snapshot strip: Global MCap, BTC.D, S&P 500, Fear & Greed. */
export function HeaderTicker() {
  const { data, isLoading, isError } = useMarketOverview()

  const items = [
    {
      label: 'Global MCap',
      value: data ? formatPrice(data.totalMarketCap) : '—',
      tone: 'accent' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M3 12h18M12 4a14 14 0 010 16M12 4a14 14 0 000 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      label: 'BTC.D',
      value: data ? `${data.btcDominance.toFixed(1)}%` : '—',
      tone: 'amber' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 7h6.2a2.8 2.8 0 010 5.6H8V7zM8 12.6h6.8A2.8 2.8 0 0114.8 18H8v-5.4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 5.5v1.5M13 5.5v1.5M10 18v1.5M13 18v1.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      label: 'S&P 500',
      value: data ? formatPrice(data.spxPrice) : '—',
      change: data?.spxChangePercent,
      tone: 'sky' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 16l4.5-5 3.5 3 5-7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Fear & Greed',
      value: data ? `${data.fearGreed} · ${data.fearGreedLabel}` : '—',
      tone: 'default' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 20a8 8 0 100-16 8 8 0 000 16z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M8.5 13.5c.8 1.2 2 1.9 3.5 1.9s2.7-.7 3.5-1.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="9" cy="10" r="0.9" fill="currentColor" />
          <circle cx="15" cy="10" r="0.9" fill="currentColor" />
        </svg>
      ),
    },
  ]

  return (
    <div className="relative border-t border-border/40 bg-surface-elevated/50">
      <div
        className={`flex items-center gap-2 overflow-x-auto px-3 py-2.5 scrollbar-thin sm:px-4 lg:px-6 ${
          isLoading ? 'opacity-60' : ''
        }`}
        role="region"
        aria-label="Market ticker tape"
      >
        <div className="flex min-w-max items-center gap-2">
          {items.map((item) => (
            <TickerChip key={item.label} {...item} />
          ))}
        </div>

        {isError && (
          <span className="shrink-0 rounded-lg bg-amber/10 px-2.5 py-1.5 text-xs font-medium text-amber ring-1 ring-amber/25">
            Tape delayed — sources recovering
          </span>
        )}

        {/* Live clock — desktop */}
        <div className="ml-auto hidden shrink-0 items-center gap-2 pl-2 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bullish opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-bullish" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Live
          </span>
          {data && (
            <span className="font-mono text-[11px] text-muted/80">
              {new Date(data.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
