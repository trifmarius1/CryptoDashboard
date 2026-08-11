import { useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { usePortfolio, type HoldingValuation } from '../hooks/usePortfolio'
import { formatFiat } from '../services/fxRates'
import { formatPercent } from '../services/financialApi'

const ALLOC_COLORS = [
  '#2dd4bf',
  '#38bdf8',
  '#a78bfa',
  '#fbbf24',
  '#fb7185',
  '#34d399',
  '#f472b6',
  '#94a3b8',
]

function AssetBadge({ symbol, name }: { symbol: string; name: string }) {
  const letter = symbol.replace(/[^A-Za-z]/g, '').slice(0, 3) || '?'
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-sky-500/20 font-mono text-[10px] font-extrabold text-accent ring-1 ring-accent/25"
        title={name}
      >
        {letter}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-50">{symbol}</div>
        <div className="truncate text-[11px] text-muted">{name}</div>
      </div>
    </div>
  )
}

function AllocationBar({ rows }: { rows: HoldingValuation[] }) {
  if (!rows.length) {
    return (
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.04] ring-1 ring-border/50" />
    )
  }
  return (
    <div
      className="flex h-3 overflow-hidden rounded-full ring-1 ring-border/50"
      role="img"
      aria-label="Portfolio allocation"
    >
      {rows.map((r, i) => (
        <div
          key={r.holding.id}
          title={`${r.asset.symbol}: ${r.allocationPct.toFixed(1)}%`}
          style={{
            width: `${Math.max(r.allocationPct, 0.5)}%`,
            background: ALLOC_COLORS[i % ALLOC_COLORS.length],
          }}
          className="h-full transition-all"
        />
      ))}
    </div>
  )
}

function AllocationDonut({ rows, size = 120 }: { rows: HoldingValuation[]; size?: number }) {
  const cx = 50
  const cy = 50
  const r = 40
  const stroke = 12
  const circ = 2 * Math.PI * r
  let offset = 0
  if (!rows.length) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted"
          style={{ fontSize: 9 }}
        >
          Empty
        </text>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto -rotate-90">
      {rows.map((row, i) => {
        const pct = Math.max(row.allocationPct, 0) / 100
        const dash = pct * circ
        const gap = circ - dash
        const el = (
          <circle
            key={row.holding.id}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={ALLOC_COLORS[i % ALLOC_COLORS.length]}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

interface Props {
  /** Compact sticky sidebar mode vs full-page tab. */
  variant?: 'sidebar' | 'page'
  className?: string
}

/**
 * F. Live Portfolio & Investment Tracker
 * Holdings CRUD · USD/EUR · live WS valuation · allocation · JSON backup
 */
export function PortfolioTracker({ variant = 'page', className }: Props) {
  const {
    ready,
    state,
    summary,
    setCurrency,
    addHolding,
    updateHolding,
    removeHolding,
    portfolioAssets,
  } = usePortfolio()

  const [assetId, setAssetId] = useState(portfolioAssets[0]?.id ?? 'btc-usd')
  const [amount, setAmount] = useState('')
  const [avgBuy, setAvgBuy] = useState('')
  const [error, setError] = useState<string | null>(null)

  const currency = state?.currency ?? 'USD'
  const rate = summary?.usdToEur ?? 0.92

  const fiat = (usd: number, opts?: { signed?: boolean; compact?: boolean }) =>
    formatFiat(usd, currency, rate, opts)

  const onAdd = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount held')
      return
    }
    const avg = avgBuy.trim() === '' ? undefined : Number(avgBuy)
    if (avg != null && (!Number.isFinite(avg) || avg < 0)) {
      setError('Average buy price must be a positive number (USD)')
      return
    }
    addHolding(assetId, amt, avg)
    setAmount('')
    setAvgBuy('')
  }

  const sortedRows = useMemo(
    () => [...(summary?.rows ?? [])].sort((a, b) => b.valueUsd - a.valueUsd),
    [summary?.rows],
  )

  if (!ready || !state || !summary) {
    return (
      <div
        className={clsx(
          'animate-pulse rounded-2xl bg-surface-card/80 p-6 ring-1 ring-border/60',
          className,
        )}
      >
        <div className="mb-3 h-4 w-40 rounded bg-white/5" />
        <div className="h-20 rounded bg-white/5" />
      </div>
    )
  }

  const isSidebar = variant === 'sidebar'

  return (
    <section
      id="portfolio-tracker"
      aria-label="Live portfolio tracker"
      className={clsx(
        'flex flex-col gap-4 rounded-2xl border border-border/70 bg-surface-card/95 shadow-card backdrop-blur-sm',
        isSidebar ? 'p-3' : 'p-3 sm:p-5',
        className,
      )}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-50 sm:text-lg">
            Live Portfolio Tracker
          </h2>
          <p className="text-[11px] text-muted sm:text-xs">
            Local-only · updates with WebSocket ticks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary.offlineValuation && (
            <span className="rounded-full bg-amber/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber ring-1 ring-amber/30">
              Offline — Cached valuation
            </span>
          )}
          {summary.wsLive && !summary.offlineValuation && (
            <span className="rounded-full bg-bullish/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-bullish ring-1 ring-bullish/25">
              WS live
            </span>
          )}
          {/* Currency toggle */}
          <div className="inline-flex rounded-xl bg-surface-elevated p-0.5 ring-1 ring-border/60">
            {(['USD', 'EUR'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={clsx(
                  'min-h-9 min-w-11 rounded-lg px-2.5 text-xs font-bold transition-colors',
                  currency === c
                    ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                    : 'text-muted hover:text-slate-100',
                )}
              >
                {c === 'USD' ? '$ USD' : '€ EUR'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Global summary */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-elevated/70 p-3 ring-1 ring-border/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Total portfolio value
          </div>
          <div className="mt-1 font-mono text-xl font-extrabold tabular-nums tracking-tight text-slate-50 sm:text-2xl">
            {fiat(summary.totalValueUsd)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted">
            FX {summary.fxSource}
            {currency === 'EUR' ? ` · 1 USD = ${rate.toFixed(4)} EUR` : ''}
          </div>
        </div>
        <div className="rounded-xl bg-surface-elevated/70 p-3 ring-1 ring-border/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            24h P&amp;L
          </div>
          <div
            className={clsx(
              'mt-1 font-mono text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl',
              summary.totalPnl24hUsd > 0
                ? 'text-bullish'
                : summary.totalPnl24hUsd < 0
                  ? 'text-bearish'
                  : 'text-slate-50',
            )}
          >
            {fiat(summary.totalPnl24hUsd, { signed: true })}
          </div>
          <div
            className={clsx(
              'mt-0.5 text-xs font-semibold tabular-nums',
              summary.totalPnl24hPct > 0
                ? 'text-bullish'
                : summary.totalPnl24hPct < 0
                  ? 'text-bearish'
                  : 'text-muted',
            )}
          >
            {formatPercent(summary.totalPnl24hPct)}
          </div>
        </div>
      </div>

      {/* Allocation */}
      <div className="rounded-xl bg-surface-elevated/50 p-3 ring-1 ring-border/40">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Allocation
          </span>
          <span className="font-mono text-[10px] text-muted">
            {sortedRows.length} asset{sortedRows.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className={clsx('gap-3', isSidebar ? 'flex flex-col' : 'flex flex-col sm:flex-row sm:items-center')}>
          {!isSidebar && (
            <div className="shrink-0">
              <AllocationDonut rows={sortedRows} size={110} />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <AllocationBar rows={sortedRows} />
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {sortedRows.map((r, i) => (
                <li key={r.holding.id} className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                  />
                  <span className="font-semibold text-slate-300">{r.asset.symbol}</span>
                  <span className="font-mono tabular-nums">{r.allocationPct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Add holding */}
      <form
        onSubmit={onAdd}
        className="space-y-2 rounded-xl bg-surface-elevated/40 p-3 ring-1 ring-border/50"
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Add / top-up holding
        </div>
        <div className={clsx('grid gap-2', isSidebar ? 'grid-cols-1' : 'sm:grid-cols-3')}>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] text-muted">Asset</span>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="min-h-11 w-full rounded-lg border-0 bg-surface px-3 text-sm text-slate-100 ring-1 ring-border/70 focus:outline-none focus:ring-accent/50"
            >
              {portfolioAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol} — {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] text-muted">Amount held</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="e.g. 0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-11 w-full rounded-lg border-0 bg-surface px-3 font-mono text-sm text-slate-100 ring-1 ring-border/70 placeholder:text-muted/50 focus:outline-none focus:ring-accent/50"
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] text-muted">Avg buy (USD, optional)</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="e.g. 42000"
              value={avgBuy}
              onChange={(e) => setAvgBuy(e.target.value)}
              className="min-h-11 w-full rounded-lg border-0 bg-surface px-3 font-mono text-sm text-slate-100 ring-1 ring-border/70 placeholder:text-muted/50 focus:outline-none focus:ring-accent/50"
            />
          </label>
        </div>
        {error && <p className="text-xs text-bearish">{error}</p>}
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl bg-accent/20 text-sm font-bold text-accent ring-1 ring-accent/40 transition-colors hover:bg-accent/30 sm:w-auto sm:px-6"
        >
          Add to portfolio
        </button>
      </form>

      {/* Holdings table */}
      <div className="min-w-0 overflow-x-auto">
        {sortedRows.length === 0 ? (
          <p className="rounded-xl bg-white/[0.02] px-3 py-6 text-center text-sm text-muted ring-1 ring-border/40">
            No holdings yet — pick an asset and amount above.
          </p>
        ) : (
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted">
                <th className="pb-2 pr-2 font-bold">Asset</th>
                <th className="pb-2 pr-2 font-bold">Amount</th>
                <th className="pb-2 pr-2 font-bold">Price</th>
                <th className="pb-2 pr-2 font-bold">24h</th>
                <th className="pb-2 pr-2 font-bold">Value</th>
                <th className="pb-2 pr-2 font-bold">24h P&amp;L</th>
                <th className="pb-2 font-bold" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr
                  key={r.holding.id}
                  className="border-b border-border/30 align-middle last:border-0"
                >
                  <td className="py-2.5 pr-2">
                    <AssetBadge symbol={r.asset.symbol} name={r.asset.name} />
                  </td>
                  <td className="py-2.5 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      defaultValue={r.holding.amount}
                      key={`${r.holding.id}-${r.holding.amount}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value)
                        if (Number.isFinite(v)) updateHolding(r.holding.id, { amount: v })
                      }}
                      className="w-24 min-h-9 rounded-md bg-surface px-2 font-mono text-xs tabular-nums ring-1 ring-border/50 focus:outline-none focus:ring-accent/40"
                    />
                  </td>
                  <td className="py-2.5 pr-2 font-mono text-xs tabular-nums text-slate-200">
                    {fiat(r.priceUsd)}
                  </td>
                  <td
                    className={clsx(
                      'py-2.5 pr-2 font-mono text-xs font-semibold tabular-nums',
                      r.changePercent24h > 0
                        ? 'text-bullish'
                        : r.changePercent24h < 0
                          ? 'text-bearish'
                          : 'text-muted',
                    )}
                  >
                    {formatPercent(r.changePercent24h)}
                  </td>
                  <td className="py-2.5 pr-2 font-mono text-xs font-semibold tabular-nums text-slate-50">
                    {fiat(r.valueUsd)}
                    <div className="text-[10px] font-normal text-muted">
                      {r.allocationPct.toFixed(1)}%
                    </div>
                  </td>
                  <td
                    className={clsx(
                      'py-2.5 pr-2 font-mono text-xs font-semibold tabular-nums',
                      r.pnl24hUsd > 0
                        ? 'text-bullish'
                        : r.pnl24hUsd < 0
                          ? 'text-bearish'
                          : 'text-muted',
                    )}
                  >
                    {fiat(r.pnl24hUsd, { signed: true })}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeHolding(r.holding.id)}
                      className="min-h-9 min-w-9 rounded-lg text-muted hover:bg-bearish/10 hover:text-bearish"
                      aria-label={`Remove ${r.asset.symbol}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-border/40 pt-3">
        <span className="text-[10px] text-muted">Saved in browser · no login</span>
      </div>
    </section>
  )
}
