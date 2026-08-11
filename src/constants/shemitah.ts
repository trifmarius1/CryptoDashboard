import type { ShemitahBand, ShemitahEvent } from '../types'

/**
 * Shemitah (Shmita) 7-year Hebrew Sabbatical cycle reference data.
 *
 * Convention used here (common in macro-cycle research overlays):
 * - A Shemitah year runs roughly Tishrei (Sep/Oct) of year N-1 → Elul 29 (Sep) of year N.
 * - Historical market stress often clusters near end-of-cycle windows.
 *
 * DISCLAIMER: Educational / historical-cycle indicator only — not financial advice.
 */

export const SHEMITAH_EVENTS: ShemitahEvent[] = [
  {
    year: 1987,
    title: 'Black Monday',
    description:
      'Oct 19, 1987 — DJIA fell ~22% in a single session; global equity cascade near Shemitah year-end.',
    severity: 'crash',
  },
  {
    year: 2001,
    title: 'Dot-Com Crash',
    description:
      'Tech bubble unwind & post-9/11 equity stress culminated around the 2000–2001 Shemitah window.',
    severity: 'crash',
  },
  {
    year: 2008,
    title: 'Global Financial Crisis',
    description:
      'Lehman collapse & credit freeze — deepest equity drawdown since the Great Depression.',
    severity: 'crash',
  },
  {
    year: 2015,
    title: 'Biotech / Commodity Correction',
    description:
      'China devaluation shock, commodity crash, and biotech drawdown around Elul 2015.',
    severity: 'correction',
  },
  {
    year: 2022,
    title: 'Fed Tightening / Crypto Winter',
    description:
      '2021–2022 rate-hike cycle, inflation peak, and crypto bear market into/after the 2021–22 Shemitah window.',
    severity: 'tightening',
  },
  {
    year: 2029,
    title: 'Next Projected Cycle Window',
    description:
      'Projected 2028–2029 Shemitah end-year window for strategic planning and risk review.',
    severity: 'projected',
  },
]

/** Approximate Gregorian spans for modern Shemitah years (Elul 29 end-years). */
export const SHEMITAH_END_YEARS = [
  1952, 1959, 1966, 1973, 1980, 1987, 1994, 2001, 2008, 2015, 2022, 2029, 2036,
] as const

/**
 * Build full Shemitah band objects with event linkage.
 * Start ≈ Sep 1 of (endYear - 1); end ≈ Sep 25 of endYear (Elul 29 approximation).
 */
export function buildShemitahBands(): ShemitahBand[] {
  return SHEMITAH_END_YEARS.map((endYear) => {
    const startDate = new Date(Date.UTC(endYear - 1, 8, 1)) // Sep 1 prior year
    const endDate = new Date(Date.UTC(endYear, 8, 25)) // ~Elul 29
    const events = SHEMITAH_EVENTS.filter(
      (e) => e.year === endYear || e.year === endYear - 1 || e.year === endYear + 1,
    )
    return {
      endYear,
      startDate,
      endDate,
      label: `Shemitah ${endYear - 1}–${endYear}`,
      events,
    }
  })
}

/** Capital preservation / invest-window educational copy. */
export const SHEMITAH_GUIDANCE = {
  investWindows: [
    'Historically, multi-year risk-on expansions often begin in the 1–2 years after Elul 29 (post-Shemitah).',
    'Late-Shemitah / post-Elul drawdowns have been used by some cycle traders as staged accumulation zones — never as guaranteed bottoms.',
    'DCA and position sizing matter more than precise timing; treat bands as context, not signals.',
  ],
  riskOffWindows: [
    'Reduce leverage and speculative concentration heading into the 7th (Shemitah) year when equity/crypto valuations are extended.',
    'Raise cash buffers 6–12 months before Elul 29 when macro stress indicators (credit spreads, real rates) are elevated.',
    'Rebalance toward quality / lower-beta exposures during sabbatical years rather than chasing late-cycle momentum.',
  ],
  disclaimer:
    'Shemitah analytics are a historical cycle / numerological macro overlay for educational and strategy backtesting purposes only. They are not investment advice, do not predict future returns, and past cycle alignments do not guarantee future outcomes.',
} as const
