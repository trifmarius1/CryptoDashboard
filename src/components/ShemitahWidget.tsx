import { useMemo, useState, type ReactNode } from 'react'
import {
  getShemitahEvents,
  getShemitahGuidance,
  getShemitahStats,
} from '../services/shemitah'
import { AssetCard } from './AssetCard'
import { ASSETS } from '../constants/assets'

const severityStyles: Record<string, string> = {
  crash: 'border-bearish/40 bg-bearish/10 text-red-200',
  correction: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  tightening: 'border-orange-400/40 bg-orange-400/10 text-orange-100',
  projected: 'border-accent/40 bg-accent/10 text-sky-100',
}

/**
 * Shemitah Cycle Intelligence Widget + dual multi-year charts (SPX & BTC)
 * with toggleable 7-year sabbatical bands and historical event markers.
 */
export function ShemitahWidget() {
  const stats = useMemo(() => getShemitahStats(), [])
  const events = useMemo(() => getShemitahEvents(), [])
  const guidance = useMemo(() => getShemitahGuidance(), [])
  const [tab, setTab] = useState<'rules' | 'events'>('rules')

  const btc = ASSETS.find((a) => a.id === 'btc-usd')!
  const spx = ASSETS.find((a) => a.id === 'spx')!

  const phaseLabel =
    stats.currentPhase === 'shemitah'
      ? 'In Shemitah Year'
      : stats.currentPhase === 'approaching'
        ? 'Approaching Shemitah'
        : 'Post-Shemitah Expansion'

  return (
    <section
      id="shemitah"
      className="scroll-mt-20 space-y-4"
      aria-labelledby="shemitah-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-400/90">
            Macro Financial Cycles
          </p>
          <h2
            id="shemitah-heading"
            className="mt-1 text-fluid-xl font-bold tracking-tight text-slate-50"
          >
            Shemitah 7-Year Cycle Overlay
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Interactive sabbatical-year bands on multi-year S&P 500 and Bitcoin
            charts, with historical event markers and educational cycle
            intelligence.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-wider text-amber-200/80">
            Current phase
          </div>
          <div className="text-sm font-semibold text-amber-100">{phaseLabel}</div>
          <div className="text-xs text-muted">
            Next window {stats.nextCycleWindow} · ~{stats.yearsToNext}y
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Sabbatical avg return"
          value={`${stats.sabbaticalAvgReturn.toFixed(1)}%`}
          tone="bear"
        />
        <Stat
          label="Expansion avg return"
          value={`+${stats.expansionAvgReturn.toFixed(1)}%`}
          tone="bull"
        />
        <Stat
          label="Sabbatical win rate"
          value={`${stats.sabbaticalWinRate}%`}
          tone="neutral"
        />
        <Stat
          label="Expansion win rate"
          value={`${stats.expansionWinRate}%`}
          tone="bull"
        />
        <Stat
          label="Sabbatical avg DD"
          value={`${stats.sabbaticalAvgDrawdown.toFixed(1)}%`}
          tone="bear"
        />
        <Stat
          label="Expansion avg DD"
          value={`${stats.expansionAvgDrawdown.toFixed(1)}%`}
          tone="neutral"
        />
      </div>

      {/* Dual charts with Shemitah overlay capability */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AssetCard asset={spx} defaultTimeframe="1Y" shemitahCapable idSuffix="shemitah" />
        <AssetCard asset={btc} defaultTimeframe="1Y" shemitahCapable idSuffix="shemitah" />
      </div>

      {/* Intelligence panel */}
      <div className="rounded-2xl border border-border/70 bg-surface-card/90 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <TabBtn active={tab === 'rules'} onClick={() => setTab('rules')}>
            When to Invest / Capital Preservation
          </TabBtn>
          <TabBtn active={tab === 'events'} onClick={() => setTab('events')}>
            Historical Event Indicators
          </TabBtn>
        </div>

        {tab === 'rules' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <GuideCard title="Historical entry windows" tone="bull">
              <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
                {guidance.investWindows.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bullish" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </GuideCard>
            <GuideCard title="Risk-off windows" tone="bear">
              <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
                {guidance.riskOffWindows.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bearish" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </GuideCard>
          </div>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {events.map((e) => (
              <li
                key={`${e.year}-${e.title}`}
                className={`rounded-xl border p-3 ${severityStyles[e.severity]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{e.title}</span>
                  <span className="font-mono text-xs opacity-80">{e.year}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed opacity-90 sm:text-sm">
                  {e.description}
                </p>
              </li>
            ))}
          </ol>
        )}

        <p
          role="note"
          className="mt-4 rounded-lg border border-border/60 bg-surface-elevated/50 px-3 py-2 text-[11px] leading-relaxed text-muted sm:text-xs"
        >
          <strong className="text-amber-300/90">Disclaimer: </strong>
          {guidance.disclaimer}
        </p>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'bull' | 'bear' | 'neutral'
}) {
  const color =
    tone === 'bull' ? 'text-bullish' : tone === 'bear' ? 'text-bearish' : 'text-slate-100'
  return (
    <div className="rounded-xl border border-border/60 bg-surface-elevated/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted sm:text-[11px]">
        {label}
      </div>
      <div className={`mt-1 font-mono text-lg font-bold tabular-nums sm:text-xl ${color}`}>
        {value}
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 touch-manipulation rounded-lg px-3 text-xs font-semibold transition-colors sm:text-sm ${
        active
          ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40'
          : 'bg-surface-elevated text-muted ring-1 ring-border hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function GuideCard({
  title,
  tone,
  children,
}: {
  title: string
  tone: 'bull' | 'bear'
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === 'bull'
          ? 'border-bullish/25 bg-bullish/5'
          : 'border-bearish/25 bg-bearish/5'
      }`}
    >
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{title}</h3>
      {children}
    </div>
  )
}
