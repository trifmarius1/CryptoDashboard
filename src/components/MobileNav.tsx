import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { NavSection } from '../types'

interface Props {
  active: NavSection
  onChange: (section: NavSection) => void
}

const TABS: {
  id: NavSection
  label: string
  icon: (active: boolean) => ReactNode
}[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    id: 'macro',
    label: 'Macro',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path
          d="M8 15l3.2-4.2 3 2.4L18 8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M3 10h18M8 6V5a1 1 0 011-1h6a1 1 0 011 1v1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'shemitah',
    label: 'Cycles',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 7.5v4.2l2.8 1.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

/** Sticky bottom tab bar for smartphones (<768px). */
export function MobileNav({ active, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
      aria-label="Primary"
    >
      <ul className="grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-4 px-0.5">
        {TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                className={clsx(
                  'pressable flex h-full min-h-11 w-full touch-manipulation flex-col items-center justify-center gap-0.5 text-[9px] font-bold tracking-wide sm:text-[10px]',
                  isActive ? 'text-accent' : 'text-muted hover:text-slate-200',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-accent/15 text-accent shadow-glow scale-105'
                      : 'text-current',
                  )}
                >
                  {tab.icon(isActive)}
                </span>
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
