import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { ASSETS } from '../constants/assets'
import { useCustomCrypto } from '../hooks/useCustomCrypto'
import {
  coinToAsset,
  fetchBinanceUsdtCatalog,
  type BinanceUsdtCoin,
} from '../services/customCrypto'

interface Props {
  open: boolean
  onClose: () => void
  onAdded?: (assetId: string) => void
}

/**
 * Modal: search full Binance USDT spot list and add a coin as a dashboard card.
 */
export function AddCryptoModal({ open, onClose, onAdded }: Props) {
  const { custom, add } = useCustomCrypto()
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<BinanceUsdtCoin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busySymbol, setBusySymbol] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const list = await fetchBinanceUsdtCatalog()
        if (!cancelled) setCatalog(list)
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const existingIds = useMemo(() => {
    const s = new Set(ASSETS.filter((a) => a.category === 'crypto').map((a) => a.id))
    for (const c of custom) s.add(c.id)
    return s
  }, [custom])

  const existingSymbols = useMemo(() => {
    const s = new Set(
      ASSETS.filter((a) => a.binanceSymbol).map((a) => a.binanceSymbol!.toUpperCase()),
    )
    for (const c of custom) {
      if (c.binanceSymbol) s.add(c.binanceSymbol.toUpperCase())
    }
    return s
  }, [custom])

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    const list = !q
      ? catalog
      : catalog.filter(
          (c) =>
            c.baseAsset.toUpperCase().includes(q) ||
            c.binanceSymbol.toUpperCase().includes(q) ||
            c.name.toUpperCase().includes(q),
        )
    return list.slice(0, 200)
  }, [catalog, query])

  if (!open) return null

  const handleAdd = (coin: BinanceUsdtCoin) => {
    const asset = coinToAsset(coin)
    if (existingIds.has(asset.id) || existingSymbols.has(coin.binanceSymbol)) {
      setError(`${coin.baseAsset} is already on your dashboard`)
      return
    }
    setBusySymbol(coin.binanceSymbol)
    setError(null)
    try {
      add(coin)
      onAdded?.(asset.id)
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusySymbol(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 backdrop-blur-sm animate-fade-in sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-crypto-title"
      data-testid="add-crypto-dialog"
      onClick={(e) => {
        // Click dimmed backdrop (outside panel) closes the modal
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative z-[1] flex max-h-[min(85dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl border border-border/70 bg-surface-card shadow-card sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
          <div>
            <h2 id="add-crypto-title" className="text-base font-extrabold text-slate-50">
              Add crypto asset
            </h2>
            <p className="text-xs text-muted">
              Full Binance USDT list · same charts as BTC / ETH
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pressable min-h-10 min-w-10 rounded-lg text-muted hover:bg-white/5 hover:text-slate-100"
            aria-label="Close"
            data-testid="add-crypto-close"
          >
            ×
          </button>
        </header>

        <div className="border-b border-border/40 px-4 py-3">
          <label className="block">
            <span className="sr-only">Search coins</span>
            <input
              type="search"
              autoFocus
              placeholder="Search e.g. DOGE, LINK, AVAX…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-11 w-full rounded-xl border-0 bg-surface px-3 text-sm text-slate-100 ring-1 ring-border/70 placeholder:text-muted/60 focus:outline-none focus:ring-accent/50"
            />
          </label>
          <p className="mt-1.5 text-[11px] text-muted">
            {loading
              ? 'Loading coin catalog…'
              : `${catalog.length.toLocaleString()} USDT pairs · showing ${filtered.length}`}
          </p>
        </div>

        {error && (
          <p className="px-4 pt-2 text-xs text-bearish" role="alert">
            {error}
          </p>
        )}

        <ul className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading && (
            <li className="px-3 py-8 text-center text-sm text-muted">
              Fetching all coins from Binance…
            </li>
          )}
          {!loading && filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted">No coins match your search.</li>
          )}
          {filtered.map((coin) => {
            const asset = coinToAsset(coin)
            const already =
              existingIds.has(asset.id) || existingSymbols.has(coin.binanceSymbol)
            return (
              <li key={coin.binanceSymbol}>
                <button
                  type="button"
                  data-testid={`add-coin-${coin.baseAsset.toUpperCase()}`}
                  disabled={already || busySymbol === coin.binanceSymbol}
                  onClick={() => handleAdd(coin)}
                  className={clsx(
                    'pressable flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors',
                    already
                      ? 'cursor-default opacity-50'
                      : 'hover:bg-white/[0.05]',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 font-mono text-[10px] font-bold text-accent ring-1 ring-accent/25">
                    {coin.baseAsset.slice(0, 4)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm font-semibold text-slate-100">
                      {coin.baseAsset}
                      <span className="text-muted">/USD</span>
                    </span>
                    <span className="block text-[11px] text-muted">{coin.binanceSymbol}</span>
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold',
                      already
                        ? 'bg-white/5 text-muted'
                        : 'bg-accent/15 text-accent ring-1 ring-accent/30',
                    )}
                  >
                    {already ? 'Added' : 'Add'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
