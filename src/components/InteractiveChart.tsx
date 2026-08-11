import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { COLORS } from '../constants/assets'
import { computeSMA } from '../services/financialApi'
import {
  getEventMarkers,
  getShemitahChartMarkers,
} from '../services/shemitah'
import type { Candle, Timeframe } from '../types'
import { TimeframeSelector } from './TimeframeSelector'

interface Props {
  candles: Candle[]
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  preferLine?: boolean
  isPercent?: boolean
  unit?: string
  showVolume?: boolean
  showSMA?: boolean
  /** Paint Shemitah bands + historical event markers (SPX / BTC multi-year). */
  shemitahOverlay?: boolean
  shemitahEnabled?: boolean
  onToggleShemitah?: (enabled: boolean) => void
  height?: number | string
  className?: string
  loading?: boolean
}

function toUtc(t: number): UTCTimestamp {
  return t as UTCTimestamp
}

/**
 * Canvas chart: OHLC candles / line, volume, SMA 50/200,
 * Shemitah cycle overlay, responsive resize, touch-safe pan.
 */
export function InteractiveChart({
  candles,
  timeframe,
  onTimeframeChange,
  preferLine = false,
  isPercent = false,
  unit,
  showVolume = true,
  showSMA = true,
  shemitahOverlay = false,
  shemitahEnabled = false,
  onToggleShemitah,
  height = 320,
  className = '',
  loading = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(
    null,
  )
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const sma50Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const sma200Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const overlayCleanupRef = useRef<(() => void) | null>(null)
  const [ready, setReady] = useState(false)

  // Init chart once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: COLORS.muted,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(30, 37, 51, 0.65)' },
        horzLines: { color: 'rgba(30, 37, 51, 0.65)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(59, 130, 246, 0.45)',
          labelBackgroundColor: COLORS.accent,
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.45)',
          labelBackgroundColor: COLORS.accent,
        },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.12, bottom: showVolume ? 0.22 : 0.06 },
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart
    setReady(true)

    // Prevent page scroll while interacting with chart on touch devices
    const preventScroll = (e: TouchEvent) => {
      if (e.touches.length >= 1) e.preventDefault()
    }
    el.addEventListener('touchmove', preventScroll, { passive: false })

    return () => {
      el.removeEventListener('touchmove', preventScroll)
      overlayCleanupRef.current?.()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      volumeRef.current = null
      sma50Ref.current = null
      sma200Ref.current = null
      setReady(false)
    }
  }, [showVolume])

  // (Re)create primary series when mode changes
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !ready) return

    // Clear previous series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current)
      seriesRef.current = null
    }
    if (volumeRef.current) {
      chart.removeSeries(volumeRef.current)
      volumeRef.current = null
    }
    if (sma50Ref.current) {
      chart.removeSeries(sma50Ref.current)
      sma50Ref.current = null
    }
    if (sma200Ref.current) {
      chart.removeSeries(sma200Ref.current)
      sma200Ref.current = null
    }

    if (preferLine) {
      // Market-cap aggregates are in the billions/trillions — tiny minMove
      // breaks lightweight-charts price scales and can render a blank chart.
      const mcapFormat = {
        type: 'custom' as const,
        minMove: 1e6,
        formatter: (v: number) => {
          const abs = Math.abs(v)
          if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
          if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
          if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
          return `$${v.toFixed(0)}`
        },
      }
      const indexFormat = {
        type: 'custom' as const,
        minMove: 1,
        formatter: (v: number) => `${Math.round(v)}`,
      }
      const priceFormat = isPercent
        ? {
            type: 'custom' as const,
            minMove: 0.01,
            formatter: (v: number) => `${v.toFixed(2)}%`,
          }
        : unit === 'INDEX'
          ? indexFormat
          : unit === 'USD' || unit === undefined
            ? mcapFormat
            : { type: 'price' as const, precision: 2, minMove: 0.01 }

      seriesRef.current = chart.addSeries(LineSeries, {
        color: unit === 'INDEX' ? COLORS.amber : COLORS.accent,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        priceFormat,
      })
    } else {
      seriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: COLORS.bullish,
        downColor: COLORS.bearish,
        borderUpColor: COLORS.bullish,
        borderDownColor: COLORS.bearish,
        wickUpColor: COLORS.bullish,
        wickDownColor: COLORS.bearish,
        priceLineVisible: false,
      })
    }

    if (showVolume && !preferLine) {
      volumeRef.current = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })
    }

    if (showSMA && !preferLine) {
      sma50Ref.current = chart.addSeries(LineSeries, {
        color: '#60A5FA',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      sma200Ref.current = chart.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
    }
  }, [ready, preferLine, isPercent, unit, showVolume, showSMA])

  // Push data
  useEffect(() => {
    const series = seriesRef.current
    if (!series || !candles.length) return

    if (preferLine) {
      const lineData: LineData<Time>[] = candles.map((c) => ({
        time: toUtc(c.time),
        value: c.close,
      }))
      ;(series as ISeriesApi<'Line'>).setData(lineData)
    } else {
      const candleData: CandlestickData<Time>[] = candles.map((c) => ({
        time: toUtc(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      ;(series as ISeriesApi<'Candlestick'>).setData(candleData)

      if (volumeRef.current) {
        const vols: HistogramData<Time>[] = candles.map((c) => ({
          time: toUtc(c.time),
          value: c.volume ?? 0,
          color:
            c.close >= c.open
              ? 'rgba(0, 192, 135, 0.35)'
              : 'rgba(255, 59, 48, 0.35)',
        }))
        volumeRef.current.setData(vols)
      }

      if (sma50Ref.current) {
        sma50Ref.current.setData(
          computeSMA(candles, 50).map((p) => ({
            time: toUtc(p.time),
            value: p.value,
          })),
        )
      }
      if (sma200Ref.current) {
        sma200Ref.current.setData(
          computeSMA(candles, 200).map((p) => ({
            time: toUtc(p.time),
            value: p.value,
          })),
        )
      }
    }

    chartRef.current?.timeScale().fitContent()
  }, [candles, preferLine])

  // Shemitah overlay via primitive markers (HTML overlay layer)
  const paintShemitah = useCallback(() => {
    overlayCleanupRef.current?.()
    overlayCleanupRef.current = null

    const chart = chartRef.current
    const el = containerRef.current
    if (!chart || !el || !shemitahOverlay || !shemitahEnabled || !candles.length) {
      return
    }

    const layer = document.createElement('div')
    layer.className = 'pointer-events-none absolute inset-0 overflow-hidden'
    layer.setAttribute('aria-hidden', 'true')
    el.style.position = 'relative'
    el.appendChild(layer)

    const from = candles[0].time
    const to = candles[candles.length - 1].time
    const bands = getShemitahChartMarkers(from, to)
    const events = getEventMarkers().filter((e) => e.time >= from && e.time <= to)

    const render = () => {
      layer.innerHTML = ''
      const ts = chart.timeScale()

      for (const band of bands) {
        const x1 = ts.timeToCoordinate(toUtc(band.time))
        const x2 = ts.timeToCoordinate(toUtc(band.endTime))
        if (x1 == null && x2 == null) continue
        const left = Math.min(x1 ?? 0, x2 ?? el.clientWidth)
        const right = Math.max(x1 ?? 0, x2 ?? 0)
        const width = Math.max(2, right - left)
        const bandEl = document.createElement('div')
        bandEl.style.cssText = `
          position:absolute; top:0; bottom:0; left:${left}px; width:${width}px;
          background: rgba(245, 158, 11, 0.08);
          border-left: 1px solid rgba(245, 158, 11, 0.45);
          border-right: 1px solid rgba(245, 158, 11, 0.45);
        `
        const label = document.createElement('span')
        label.textContent = band.label
        label.style.cssText = `
          position:absolute; top:4px; left:4px; font-size:9px; font-weight:600;
          color: rgba(245, 158, 11, 0.9); white-space:nowrap;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        `
        bandEl.appendChild(label)
        layer.appendChild(bandEl)
      }

      for (const ev of events) {
        const x = ts.timeToCoordinate(toUtc(ev.time))
        if (x == null) continue
        const line = document.createElement('div')
        const color =
          ev.severity === 'projected'
            ? 'rgba(59, 130, 246, 0.7)'
            : 'rgba(245, 158, 11, 0.85)'
        line.style.cssText = `
          position:absolute; top:0; bottom:0; left:${x}px; width:1px;
          background: ${color};
        `
        const tag = document.createElement('span')
        tag.textContent = ev.title
        tag.style.cssText = `
          position:absolute; top:18px; left:3px; font-size:9px; font-weight:600;
          color: ${color}; writing-mode: vertical-rl; transform: rotate(180deg);
          max-height: 70%; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0,0,0,0.85);
        `
        line.appendChild(tag)
        layer.appendChild(line)
      }
    }

    render()
    const onRangeChange = () => {
      render()
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange)

    overlayCleanupRef.current = () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange)
      layer.remove()
    }
  }, [candles, shemitahEnabled, shemitahOverlay])

  useEffect(() => {
    paintShemitah()
    return () => {
      overlayCleanupRef.current?.()
      overlayCleanupRef.current = null
    }
  }, [paintShemitah, ready])

  const style: CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    minHeight: 220,
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
        <div className="flex flex-wrap items-center gap-2">
          {showSMA && !preferLine && (
            <div className="hidden items-center gap-3 text-[10px] text-muted sm:flex sm:text-xs">
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-0.5 w-3 rounded bg-sky-400" /> SMA 50
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="inline-block h-0.5 w-3 rounded bg-amber-400" /> SMA 200
              </span>
            </div>
          )}
          {shemitahOverlay && onToggleShemitah && (
            <button
              type="button"
              onClick={() => onToggleShemitah(!shemitahEnabled)}
              className={`min-h-11 min-w-11 touch-manipulation rounded-lg px-3 text-xs font-semibold ring-1 transition-colors ${
                shemitahEnabled
                  ? 'bg-amber-500/20 text-amber-300 ring-amber-500/40'
                  : 'bg-surface-elevated text-muted ring-border hover:text-slate-100'
              }`}
              aria-pressed={shemitahEnabled}
            >
              Shemitah
            </button>
          )}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-xl bg-surface-elevated/40 ring-1 ring-border/60"
        style={style}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/50 backdrop-blur-[2px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full touch-none" />
      </div>
    </div>
  )
}
