import clsx from 'clsx'

interface Props {
  size?: number
  className?: string
  /** Show wordmark next to mark */
  withWordmark?: boolean
  compact?: boolean
}

/**
 * CryptoMacro brand — orbit + rising chart mark (SVG for crisp UI at any size).
 */
export function BrandLogo({
  size = 40,
  className,
  withWordmark = false,
  compact = false,
}: Props) {
  return (
    <div className={clsx('flex min-w-0 items-center gap-2.5', className)}>
      <span
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-accent/30 shadow-lg shadow-accent/15"
        style={{ width: size, height: size }}
      >
        <img
          src={`${import.meta.env.BASE_URL}logo-mark.svg`}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          decoding="async"
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-tr from-accent/10 to-sky-400/10"
          aria-hidden
        />
      </span>
      {withWordmark && (
        <div className="min-w-0">
          <div
            className={clsx(
              'truncate font-extrabold tracking-tight text-slate-50',
              compact ? 'text-sm' : 'text-[15px]',
            )}
          >
            CryptoMacro
          </div>
          {!compact && (
            <div className="truncate text-[11px] font-medium text-muted">
              Markets · Macro · Cycles
            </div>
          )}
        </div>
      )}
    </div>
  )
}
