import { useCallback, useEffect, useMemo, useState } from 'react'
import { ASSETS, SECTION_META } from '../constants/assets'
import type { AssetCategory, NavSection } from '../types'
import { AssetCard } from './AssetCard'
import { HeaderTicker } from './HeaderTicker'
import { MobileNav } from './MobileNav'
import { PortfolioTracker } from './PortfolioTracker'
import { ShemitahWidget } from './ShemitahWidget'
import { Sidebar } from './Sidebar'
import { useLiveTicks } from '../hooks/useLiveTicks'

const SECTION_ORDER: AssetCategory[] = [
  'crypto',
  'equity',
  'aggregate',
  'macro',
  'pair',
]

export function Dashboard() {
  const [section, setSection] = useState<NavSection>('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { wsLive } = useLiveTicks()

  const scrollToAsset = useCallback((assetId: string) => {
    requestAnimationFrame(() => {
      document
        .getElementById(`asset-${assetId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const navigate = useCallback(
    (next: NavSection, assetId?: string) => {
      setSection(next)
      if (next === 'shemitah') {
        requestAnimationFrame(() => {
          document.getElementById('shemitah')?.scrollIntoView({ behavior: 'smooth' })
        })
      }
      if (next === 'macro') {
        requestAnimationFrame(() => {
          document
            .getElementById('section-macro')
            ?.scrollIntoView({ behavior: 'smooth' })
        })
      }
      if (next === 'portfolio') {
        requestAnimationFrame(() => {
          document
            .getElementById('portfolio-tracker')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      if (assetId) {
        setSection('dashboard')
        setTimeout(() => scrollToAsset(assetId), 50)
      }
      window.scrollTo({
        top: 0,
        behavior: next === 'dashboard' && !assetId ? 'smooth' : 'auto',
      })
    },
    [scrollToAsset],
  )

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'shemitah') setSection('shemitah')
    if (hash === 'macro') setSection('macro')
    if (hash === 'portfolio') setSection('portfolio')
  }, [])

  const grouped = useMemo(() => {
    return SECTION_ORDER.map((cat) => ({
      cat,
      meta: SECTION_META[cat],
      assets: ASSETS.filter((a) => a.category === cat),
    })).filter((g) => g.assets.length)
  }, [])

  const sectionTitle: Record<NavSection, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Market Overview',
      subtitle: 'Live crypto, equity benchmarks & aggregates',
    },
    macro: {
      title: 'Macro Desk',
      subtitle: 'S&P 500 correlation and market-cap structure',
    },
    portfolio: {
      title: 'Live Portfolio',
      subtitle: 'Holdings · USD/EUR valuation · local backup',
    },
    shemitah: {
      title: 'Shemitah Cycles',
      subtitle: 'Seven-year sabbatical market intelligence',
    },
  }

  const heading = sectionTitle[section]
  const showMarketFeed = section === 'dashboard' || section === 'macro'

  return (
    <div className="flex min-h-dvh text-slate-100">
      <Sidebar
        activeSection={section}
        onNavigate={navigate}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        wsLive={wsLive}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-surface/80 backdrop-blur-xl">
          <div className="flex min-h-14 items-center gap-3 px-3 py-2 sm:px-4 lg:px-6">
            <button
              type="button"
              className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-xl bg-white/[0.03] text-slate-200 ring-1 ring-border/70 transition-colors hover:bg-white/[0.06] lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[15px] font-extrabold tracking-tight text-slate-50 sm:text-base">
                  {heading.title}
                </h1>
                <span className="hidden rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent ring-1 ring-accent/25 sm:inline">
                  2026
                </span>
              </div>
              <p className="hidden truncate text-[12px] font-medium text-muted sm:block">
                {heading.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('portfolio')}
                className="hidden min-h-10 items-center gap-1.5 rounded-full bg-accent/10 px-3 text-[11px] font-bold text-accent ring-1 ring-accent/30 transition-colors hover:bg-accent/20 md:inline-flex xl:hidden"
              >
                Portfolio
              </button>
              <span
                className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold tracking-wide sm:inline-flex ${
                  wsLive
                    ? 'bg-bullish/12 text-bullish ring-1 ring-bullish/25'
                    : 'bg-white/[0.04] text-muted ring-1 ring-border/60'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${wsLive ? 'bg-bullish' : 'bg-muted'}`}
                />
                {wsLive ? 'WebSocket live' : 'REST mode'}
              </span>
            </div>
          </div>
          <HeaderTicker />
        </header>

        <main
          className="flex-1 overflow-x-hidden px-3 pb-24 pt-5 sm:px-4 sm:pt-6 lg:px-6 lg:pb-8"
          style={{ minHeight: 'calc(100dvh - 7rem)' }}
        >
          {section === 'shemitah' ? (
            <ShemitahWidget />
          ) : section === 'portfolio' ? (
            <PortfolioTracker variant="page" />
          ) : (
            <div className="space-y-8">
              {showMarketFeed &&
                grouped.map(({ cat, meta, assets }) => {
                  if (
                    section === 'macro' &&
                    cat !== 'equity' &&
                    cat !== 'aggregate' &&
                    cat !== 'macro'
                  ) {
                    return null
                  }
                  return (
                    <section
                      key={cat}
                      id={`section-${cat}`}
                      className="scroll-mt-28"
                      aria-labelledby={`heading-${cat}`}
                    >
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <h2
                            id={`heading-${cat}`}
                            className="text-fluid-lg font-extrabold tracking-tight text-slate-50"
                          >
                            {meta.title}
                          </h2>
                          <p className="mt-0.5 text-xs font-medium text-muted sm:text-sm">
                            {meta.subtitle}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-semibold text-muted ring-1 ring-border/50">
                          {assets.length} widgets
                        </span>
                      </div>

                      <div
                        className={
                          cat === 'equity'
                            ? 'grid gap-4'
                            : 'grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2'
                        }
                      >
                        {assets.map((asset) => (
                          <AssetCard
                            key={asset.id}
                            asset={asset}
                            defaultTimeframe="1Y"
                            shemitahCapable={
                              asset.id === 'spx' || asset.id === 'btc-usd'
                            }
                            compact={
                              cat === 'pair' ||
                              cat === 'aggregate' ||
                              cat === 'macro'
                            }
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}

              {/* Full-width portfolio below market charts */}
              {(section === 'dashboard' || section === 'macro') && (
                <div className="border-t border-border/60 pt-8">
                  <PortfolioTracker variant="page" />
                </div>
              )}

              {section === 'dashboard' && (
                <div className="border-t border-border/60 pt-8">
                  <ShemitahWidget />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <MobileNav active={section} onChange={(s) => navigate(s)} />
    </div>
  )
}
