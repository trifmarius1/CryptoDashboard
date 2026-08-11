import type { ReactNode } from 'react'
import clsx from 'clsx'
import { ASSETS, SECTION_META } from '../constants/assets'
import type { AssetCategory, NavSection } from '../types'

interface Props {
  activeSection: NavSection
  onNavigate: (section: NavSection, assetId?: string) => void
  open: boolean
  onClose: () => void
  wsLive?: boolean
}

const NAV: {
  id: NavSection
  label: string
  hint: string
  icon: ReactNode
}[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    hint: 'All markets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    id: 'macro',
    label: 'Macro',
    hint: 'S&P 500 · caps',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 19V5M4 19h16"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M8 15l3.2-4.2 3 2.4L18 8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    hint: 'Live holdings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M3 10h18M8 6V5a1 1 0 011-1h6a1 1 0 011 1v1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'shemitah',
    label: 'Shemitah',
    hint: '7-year cycles',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 7.5v4.2l2.8 1.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

const WATCHLIST_ORDER: AssetCategory[] = [
  'crypto',
  'equity',
  'aggregate',
  'macro',
  'pair',
]

const CAT_ACCENT: Record<AssetCategory, string> = {
  crypto: 'bg-accent/20 text-accent',
  equity: 'bg-sky-400/15 text-sky-300',
  aggregate: 'bg-violet-400/15 text-violet-300',
  pair: 'bg-amber/15 text-amber',
  macro: 'bg-rose-400/15 text-rose-300',
}

const CAT_SHORT: Record<AssetCategory, string> = {
  crypto: 'Crypto',
  equity: 'Equity',
  aggregate: 'Caps',
  pair: 'Pairs',
  macro: 'Sentiment',
}

export function Sidebar({
  activeSection,
  onNavigate,
  open,
  onClose,
  wsLive = false,
}: Props) {
  return (
    <>
      {/* Mobile drawer backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[min(19rem,90vw)] flex-col border-r border-border/70 bg-sidebar shadow-nav transition-transform duration-200 ease-out lg:static lg:z-0 lg:w-[17.5rem] lg:translate-x-0 lg:shrink-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="relative overflow-hidden border-b border-border/50 px-4 py-4">
          <div
            className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-accent/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-sky-400 text-sm font-extrabold tracking-tight text-surface shadow-lg shadow-accent/20">
              CM
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-extrabold tracking-tight text-slate-50">
                CryptoMacro
              </div>
              <div className="text-[11px] font-medium text-muted">
                Markets · Macro · Cycles
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-slate-100 lg:hidden"
              aria-label="Close navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <nav
          className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4"
          aria-label="Sidebar"
        >
          {/* Primary navigation */}
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted/90">
            Navigate
          </p>
          <ul className="mb-5 space-y-1">
            {NAV.map((item) => {
              const active = activeSection === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(item.id)
                      onClose()
                    }}
                    className={clsx(
                      'group flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-xl px-3 text-left transition-all duration-150',
                      active
                        ? 'bg-accent/12 text-accent ring-1 ring-accent/30 shadow-sm shadow-accent/5'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white',
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                        active
                          ? 'bg-accent/20 text-accent'
                          : 'bg-white/[0.04] text-muted group-hover:text-slate-200',
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold tracking-tight">
                        {item.label}
                      </span>
                      <span
                        className={clsx(
                          'block text-[11px]',
                          active ? 'text-accent/70' : 'text-muted/80',
                        )}
                      >
                        {item.hint}
                      </span>
                    </span>
                    {active && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Watchlist jump links */}
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted/90">
              Jump to asset
            </p>
            <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {ASSETS.length}
            </span>
          </div>

          {WATCHLIST_ORDER.map((cat) => {
            const items = ASSETS.filter((a) => a.category === cat)
            if (!items.length) return null
            return (
              <div key={cat} className="mb-3">
                <div className="mb-1.5 flex items-center gap-2 px-2">
                  <span
                    className={clsx(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      CAT_ACCENT[cat],
                    )}
                  >
                    {CAT_SHORT[cat]}
                  </span>
                  <span className="truncate text-[11px] text-muted/70">
                    {SECTION_META[cat]?.subtitle ?? ''}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {items.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('dashboard', a.id)
                          onClose()
                        }}
                        className="group flex min-h-10 w-full touch-manipulation items-center gap-2 rounded-lg px-2.5 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="w-[4.5rem] shrink-0 font-mono text-[12px] font-semibold tabular-nums text-slate-200 group-hover:text-accent">
                          {a.symbol}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-muted group-hover:text-slate-300">
                          {a.name}
                        </span>
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-muted/40 opacity-0 transition-opacity group-hover:opacity-100"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M9 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Footer status */}
        <div className="border-t border-border/50 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-border/40">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {wsLive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bullish opacity-50" />
              )}
              <span
                className={clsx(
                  'relative inline-flex h-2.5 w-2.5 rounded-full',
                  wsLive ? 'bg-bullish' : 'bg-muted',
                )}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-slate-200">
                {wsLive ? 'Live stream' : 'REST mode'}
              </div>
              <div className="truncate text-[10px] text-muted">
                {wsLive ? 'Binance WebSocket connected' : 'Polling REST feeds'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
