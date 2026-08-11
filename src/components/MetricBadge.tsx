import clsx from 'clsx'
import { formatPercent } from '../services/financialApi'

interface Props {
  value: number
  className?: string
}

export function MetricBadge({ value, className }: Props) {
  const positive = value > 0
  const neutral = value === 0
  return (
    <span
      className={clsx(
        'inline-flex min-h-8 items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold tabular-nums sm:text-sm',
        neutral && 'bg-white/5 text-muted',
        !neutral && positive && 'bg-bullish/15 text-bullish',
        !neutral && !positive && 'bg-bearish/15 text-bearish',
        className,
      )}
    >
      {formatPercent(value)}
    </span>
  )
}
