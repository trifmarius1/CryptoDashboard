import { useMemo } from 'react'
import clsx from 'clsx'
import {
  TIMEFRAME_GROUPS,
  timeframeUnit,
  type TimeframeUnit,
} from '../constants/assets'
import type { Timeframe } from '../types'

interface Props {
  value: Timeframe
  onChange: (tf: Timeframe) => void
  className?: string
}

/**
 * Two-step chart range control:
 *  1) Unit row — Hours · Days · Weeks · Month · Years · All
 *  2) Count row — 1–8 hours, 1–7 days, 1–4 weeks, 1–4 years, …
 */
export function TimeframeSelector({ value, onChange, className }: Props) {
  const activeUnit = timeframeUnit(value)

  const activeGroup = useMemo(
    () => TIMEFRAME_GROUPS.find((g) => g.unit === activeUnit) ?? TIMEFRAME_GROUPS[0],
    [activeUnit],
  )

  const selectUnit = (unit: TimeframeUnit) => {
    const group = TIMEFRAME_GROUPS.find((g) => g.unit === unit)
    if (!group?.options.length) return
    // Keep same count when possible (e.g. 3H → 3D), else first option
    const n = value === 'ALL' ? 0 : Number(value.replace(/\D/g, '')) || 1
    const match = group.options.find((o) => o.id === `${n}${unit}`)
    onChange(match?.id ?? group.options[0].id)
  }

  return (
    <div
      className={clsx(
        'flex flex-col gap-1.5 rounded-xl bg-surface-elevated/80 p-1.5 ring-1 ring-border/80',
        className,
      )}
    >
      {/* Unit tabs */}
      <div
        role="tablist"
        aria-label="Chart range unit"
        className="flex flex-wrap gap-1"
      >
        {TIMEFRAME_GROUPS.map((g) => {
          const active = g.unit === activeUnit
          return (
            <button
              key={g.unit}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectUnit(g.unit)}
              className={clsx(
                'pressable min-h-9 touch-manipulation rounded-lg px-2.5 text-[11px] font-bold tracking-wide sm:min-h-10 sm:px-3 sm:text-xs',
                active
                  ? 'bg-accent/20 text-accent shadow-sm ring-1 ring-accent/40 shadow-glow'
                  : 'text-muted hover:bg-white/5 hover:text-slate-100',
              )}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      {/* Duration counts for the active unit */}
      {activeGroup.options.length > 1 && (
        <div
          role="tablist"
          aria-label={`${activeGroup.label} duration`}
          className="flex flex-wrap gap-1 border-t border-border/40 pt-1.5"
        >
          <span className="mr-1 self-center text-[10px] font-semibold uppercase tracking-wider text-muted/80">
            {activeGroup.unit === 'H'
              ? 'hrs'
              : activeGroup.unit === 'D'
                ? 'days'
                : activeGroup.unit === 'W'
                  ? 'wks'
                  : activeGroup.unit === 'M'
                    ? 'mos'
                    : activeGroup.unit === 'Y'
                      ? 'yrs'
                      : ''}
          </span>
          {activeGroup.options.map((opt) => {
            const active = value === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(opt.id)}
                className={clsx(
                  'pressable min-h-9 min-w-9 touch-manipulation rounded-lg px-2 text-xs font-bold tabular-nums sm:min-h-10 sm:min-w-10 sm:text-[13px]',
                  active
                    ? 'bg-white/10 text-slate-50 ring-1 ring-accent/50'
                    : 'text-muted hover:bg-white/5 hover:text-slate-100',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
