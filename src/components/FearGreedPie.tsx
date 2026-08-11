import { useMemo } from 'react'
import clsx from 'clsx'

/** Classic Crypto Fear & Greed zones (0–100). */
const ZONES = [
  { key: 'ef', label: 'Extreme Fear', from: 0, to: 24, color: '#ef4444' },
  { key: 'f', label: 'Fear', from: 25, to: 44, color: '#f97316' },
  { key: 'n', label: 'Neutral', from: 45, to: 55, color: '#eab308' },
  { key: 'g', label: 'Greed', from: 56, to: 74, color: '#84cc16' },
  { key: 'eg', label: 'Extreme Greed', from: 75, to: 100, color: '#22c55e' },
] as const

function zoneFor(value: number) {
  const v = Math.min(100, Math.max(0, value))
  return ZONES.find((z) => v >= z.from && v <= z.to) ?? ZONES[2]
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  // 0° at top, clockwise (matches index 0→100 around the circle)
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string {
  const large = endDeg - startDeg > 180 ? 1 : 0
  const o0 = polar(cx, cy, rOuter, startDeg)
  const o1 = polar(cx, cy, rOuter, endDeg)
  const i1 = polar(cx, cy, rInner, endDeg)
  const i0 = polar(cx, cy, rInner, startDeg)
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i0.x} ${i0.y}`,
    'Z',
  ].join(' ')
}

interface Props {
  value: number
  className?: string
  size?: number
}

/**
 * Donut pie of Fear & Greed zones with a needle on the live score.
 * Sits beside the historical line chart on the F&G card.
 */
export function FearGreedPie({ value, className, size = 220 }: Props) {
  const score = Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : 0
  const zone = zoneFor(score)

  const { slices, needle } = useMemo(() => {
    const cx = 100
    const cy = 100
    const rOuter = 88
    const rInner = 56
    // Map 0–100 index onto full 360° circle
    const slices = ZONES.map((z) => {
      const start = (z.from / 100) * 360
      // end exclusive of next zone start; last zone to 360
      const end = z.to >= 100 ? 360 : ((z.to + 1) / 100) * 360
      return {
        ...z,
        d: arcPath(cx, cy, rOuter, rInner, start, end),
        active: score >= z.from && score <= z.to,
      }
    })
    const needleAngle = (score / 100) * 360
    const tip = polar(cx, cy, rOuter + 4, needleAngle)
    const baseL = polar(cx, cy, rInner - 4, needleAngle - 6)
    const baseR = polar(cx, cy, rInner - 4, needleAngle + 6)
    return {
      slices,
      needle: { tip, baseL, baseR, angle: needleAngle },
    }
  }, [score])

  return (
    <div
      className={clsx(
        'flex h-full flex-col items-center justify-center gap-3 rounded-xl bg-surface-elevated/40 p-3 ring-1 ring-border/60',
        className,
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        Live pie gauge
      </div>

      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Fear and Greed index ${score}, ${zone.label}`}
        className="max-w-full"
      >
        {/* Soft track */}
        <circle cx="100" cy="100" r="72" fill="rgba(255,255,255,0.02)" />

        {slices.map((s) => (
          <path
            key={s.key}
            d={s.d}
            fill={s.color}
            opacity={s.active ? 1 : 0.35}
            stroke="rgba(8,11,20,0.55)"
            strokeWidth={1}
            className="transition-opacity duration-300"
          />
        ))}

        {/* Needle */}
        <polygon
          points={`${needle.tip.x},${needle.tip.y} ${needle.baseL.x},${needle.baseL.y} ${needle.baseR.x},${needle.baseR.y}`}
          fill="#e8eef8"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={0.5}
        />
        <circle cx="100" cy="100" r="8" fill="#121a2b" stroke={zone.color} strokeWidth={3} />

        {/* Center readout */}
        <text
          x="100"
          y="96"
          textAnchor="middle"
          className="fill-slate-50"
          style={{ fontSize: 28, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace' }}
        >
          {score}
        </text>
        <text
          x="100"
          y="114"
          textAnchor="middle"
          style={{
            fontSize: 9,
            fontWeight: 700,
            fill: zone.color,
            letterSpacing: '0.04em',
          }}
        >
          {zone.label.toUpperCase()}
        </text>
      </svg>

      {/* Legend */}
      <ul className="grid w-full max-w-[240px] grid-cols-1 gap-1 sm:grid-cols-1">
        {ZONES.map((z) => {
          const active = zone.key === z.key
          return (
            <li
              key={z.key}
              className={clsx(
                'flex items-center gap-2 rounded-md px-2 py-1 text-[11px]',
                active ? 'bg-white/[0.06] font-semibold text-slate-100' : 'text-muted',
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: z.color, boxShadow: active ? `0 0 8px ${z.color}` : undefined }}
              />
              <span className="min-w-0 flex-1 truncate">{z.label}</span>
              <span className="font-mono tabular-nums text-[10px] opacity-80">
                {z.from}–{z.to}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
