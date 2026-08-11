import { useCallback, useEffect, useMemo, useState } from 'react'
import { ASSETS, SECTION_META } from '../constants/assets'
import type { AssetCategory, NavSection } from '../types'
import { useCustomCrypto } from '../hooks/useCustomCrypto'
import { useLiveTicks } from '../hooks/useLiveTicks'
import { isCoreCryptoId } from '../services/customCrypto'
import { AddCryptoModal } from './AddCryptoModal'
import { AssetCard } from './AssetCard'
import { BrandLogo } from './BrandLogo'
import { HeaderTicker } from './HeaderTicker'
import { MobileNav } from './MobileNav'
import { PortfolioTracker } from './PortfolioTracker'
import { ShemitahWidget } from './ShemitahWidget'
import { Sidebar } from './Sidebar'

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
  const [addCryptoOpen, setAddCryptoOpen] = useState(false)
  const { wsLive } = useLiveTicks()
  const { custom, remove: removeCustom } = useCustomCrypto()

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
    return SECTION_ORDER.map((cat) => {
      const core = ASSETS.filter((a) => a.category === cat)
      const extras = cat === 'crypto' ? custom : []
      return {
        cat,
        meta: SECTION_META[cat],
        assets: [...core, ...extras],
      }
    }).filter((g) => g.assets.length)
  }, [custom])

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
    <div className="relative flex min-h-dvh text-slate-100">
      {/* Ambient depth orbs — visionary backdrop without cluttering content */}
      <div
        className="ambient-orb pointer-events-none fixed left-[20%] top-[12%] h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="ambient-orb pointer-events-none fixed bottom-[10%] right-[8%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl"
        style={{ animationDelay: '2.5s' }}
        aria-hidden
      />

      <Sidebar
        activeSection={section}
        onNavigate={navigate}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        wsLive={wsLive}
      />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/40 bg-surface/75 backdrop-blur-2xl">
          <div className="flex min-h-14 items-center gap-3 px-3 py-2 sm:px-4 lg:px-6">
            <button
              type="button"
              className="pressable flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-xl bg-white/[0.04] text-slate-200 ring-1 ring-border/70 hover:bg-white/[0.07] lg:hidden"
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

            <div className="hidden items-center lg:flex">
              <BrandLogo size={32} compact className="mr-3 opacity-90" />
            </div>

            <div className="min-w-0 flex-1 animate-fade-in" key={section}>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[15px] font-extrabold tracking-tight text-slate-50 sm:text-base">
                  {heading.title}
                </h1>
                <span className="hidden rounded-full bg-gradient-to-r from-accent/15 to-sky-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent ring-1 ring-accent/25 sm:inline">
                  Vision 2026
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
                className="pressable hidden min-h-10 items-center gap-1.5 rounded-full bg-accent/10 px-3 text-[11px] font-bold text-accent ring-1 ring-accent/30 hover:bg-accent/20 md:inline-flex xl:hidden"
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
                  className={`h-1.5 w-1.5 rounded-full ${wsLive ? 'bg-bullish animate-soft-pulse' : 'bg-muted'}`}
                />
                {wsLive ? 'WebSocket live' : 'REST mode'}
              </span>
            </div>
          </div>
          <HeaderTicker />
        </header>

        <main
          className="page-enter flex-1 overflow-x-hidden px-3 pb-24 pt-5 sm:px-4 sm:pt-6 lg:px-6 lg:pb-8"
          key={`main-${section}`}
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
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 animate-fade-up">
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
                        <div className="flex flex-wrap items-center gap-2">
                          {cat === 'crypto' && section === 'dashboard' && (
                            <button
                              type="button"
                              onClick={() => setAddCryptoOpen(true)}
                              className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent/15 px-3 text-xs font-bold text-accent ring-1 ring-accent/35 hover:bg-accent/25"
                            >
                              <span className="text-base leading-none" aria-hidden>
                                +
                              </span>
                              Add crypto
                            </button>
                          )}
                          <span className="rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-semibold text-muted ring-1 ring-border/50">
                            {assets.length} widgets
                          </span>
                        </div>
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
                            onRemove={
                              cat === 'crypto' && !isCoreCryptoId(asset.id)
                                ? () => removeCustom(asset.id)
                                : undefined
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

      <AddCryptoModal
        open={addCryptoOpen}
        onClose={() => setAddCryptoOpen(false)}
        onAdded={(assetId) => {
          setSection('dashboard')
          setTimeout(() => scrollToAsset(assetId), 80)
        }}
      />
    </div>
  )
}
