/**
 * Shemitah cycle calculation engine.
 * Produces bands, event markers, and educational win/loss statistics
 * derived from historical S&P 500 sabbatical vs expansion year patterns.
 */
import {
  buildShemitahBands,
  SHEMITAH_END_YEARS,
  SHEMITAH_EVENTS,
  SHEMITAH_GUIDANCE,
} from '../constants/shemitah'
import type { ShemitahBand, ShemitahEvent, ShemitahStats } from '../types'

/**
 * Approximate historical average returns / drawdowns used for the
 * intelligence widget. Numbers reflect published cycle-study ranges
 * (educational illustration — not a live backtest engine).
 */
const ILLUSTRATIVE_STATS = {
  sabbaticalAvgReturn: -4.2,
  expansionAvgReturn: 11.8,
  sabbaticalWinRate: 42,
  expansionWinRate: 78,
  sabbaticalAvgDrawdown: -18.5,
  expansionAvgDrawdown: -9.1,
} as const

export function getShemitahBands(fromYear = 1980): ShemitahBand[] {
  return buildShemitahBands().filter((b) => b.endYear >= fromYear)
}

export function getShemitahEvents(): ShemitahEvent[] {
  return SHEMITAH_EVENTS
}

export function getShemitahGuidance() {
  return SHEMITAH_GUIDANCE
}

/** Determine current phase relative to the nearest Shemitah end-year. */
export function getCurrentShemitahPhase(now = new Date()): {
  phase: ShemitahStats['currentPhase']
  yearsToNext: number
  nextEndYear: number
  activeBand: ShemitahBand | null
} {
  const year = now.getFullYear()
  const bands = buildShemitahBands()
  const active = bands.find((b) => now >= b.startDate && now <= b.endDate) ?? null

  if (active) {
    const yearsToNext = Math.max(
      0,
      (active.endDate.getTime() - now.getTime()) / (365.25 * 24 * 3600 * 1000),
    )
    return {
      phase: 'shemitah',
      yearsToNext,
      nextEndYear: active.endYear,
      activeBand: active,
    }
  }

  const next = bands.find((b) => b.endYear > year) ?? bands[bands.length - 1]
  const yearsToNext = next.endYear - year
  // "Approaching" if within 18 months of start
  const msToStart = next.startDate.getTime() - now.getTime()
  const approaching = msToStart > 0 && msToStart < 18 * 30 * 24 * 3600 * 1000

  return {
    phase: approaching ? 'approaching' : 'expansion',
    yearsToNext,
    nextEndYear: next.endYear,
    activeBand: null,
  }
}

export function getShemitahStats(now = new Date()): ShemitahStats {
  const { phase, yearsToNext, nextEndYear } = getCurrentShemitahPhase(now)
  return {
    ...ILLUSTRATIVE_STATS,
    nextCycleWindow: `2028–${nextEndYear >= 2029 ? 2029 : nextEndYear}`,
    currentPhase: phase,
    yearsToNext: Math.round(yearsToNext * 10) / 10,
  }
}

/**
 * Convert Shemitah bands into chart overlay markers (unix seconds).
 * Used by InteractiveChart to paint amber vertical lines / bands.
 */
export function getShemitahChartMarkers(
  fromTimeSec: number,
  toTimeSec: number,
): Array<{
  time: number
  endTime: number
  label: string
  events: ShemitahEvent[]
}> {
  return getShemitahBands(1970)
    .map((b) => ({
      time: Math.floor(b.startDate.getTime() / 1000),
      endTime: Math.floor(b.endDate.getTime() / 1000),
      label: b.label,
      events: b.events,
    }))
    .filter((m) => m.endTime >= fromTimeSec && m.time <= toTimeSec)
}

/** Event vertical markers (unix seconds) for crash / projected years. */
export function getEventMarkers(): Array<{
  time: number
  title: string
  severity: ShemitahEvent['severity']
}> {
  // Approximate Elul 29 / late-Sep for each event year
  return SHEMITAH_EVENTS.map((e) => ({
    time: Math.floor(Date.UTC(e.year, 8, 20) / 1000),
    title: e.title,
    severity: e.severity,
  }))
}

export function isShemitahEndYear(year: number): boolean {
  return (SHEMITAH_END_YEARS as readonly number[]).includes(year)
}
