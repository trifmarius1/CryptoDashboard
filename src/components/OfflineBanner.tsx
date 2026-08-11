import type { FeedStatus } from '../types'

interface Props {
  status?: FeedStatus | null
  className?: string
}

/**
 * Banner only when a feed explicitly failed and we are on degraded data.
 * Fresh cache / normal REST hits must NOT show a false "offline" warning.
 */
export function OfflineBanner({ status, className }: Props) {
  if (!status?.message) return null
  if (status.state === 'live' || status.state === 'rest') return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/95 sm:text-sm ${className ?? ''}`}
    >
      <span
        className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400"
        aria-hidden
      />
      <span>{status.message}</span>
    </div>
  )
}
