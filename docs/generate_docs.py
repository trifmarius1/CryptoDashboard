"""Generate CryptoMacro how-to-build and testing PDFs."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parent
ACCENT = colors.HexColor("#0d9488")
DARK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#475569")
LIGHT = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#cbd5e1")


def styles():
    base = getSampleStyleSheet()
    s = {
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=DARK,
            spaceAfter=8,
            alignment=TA_CENTER,
        ),
        "subtitle": ParagraphStyle(
            "DocSub",
            parent=base["Normal"],
            fontSize=11,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=ACCENT,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=DARK,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=DARK,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=DARK,
            leading=13,
            leftIndent=8,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=8,
            leading=11,
            textColor=DARK,
            backColor=LIGHT,
            leftIndent=4,
            rightIndent=4,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "th": ParagraphStyle(
            "TH",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=DARK,
        ),
        "td": ParagraphStyle(
            "TD",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=DARK,
            leading=11,
        ),
    }
    return s


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 15 * mm, A4[0] - 20 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "CryptoMacro · Confidential project documentation")
    canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def bullets(items, st):
    return ListFlowable(
        [ListItem(Paragraph(i, st["bullet"]), leftIndent=12, value="•") for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=15,
        spaceBefore=2,
        spaceAfter=8,
    )


def table(rows, col_widths, st):
    data = []
    for r_i, row in enumerate(rows):
        style = st["th"] if r_i == 0 else st["td"]
        data.append([Paragraph(str(c), style) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                ("TEXTCOLOR", (0, 0), (-1, 0), DARK),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]
        )
    )
    return t


def build_howto(st):
    story = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph("CryptoMacro Dashboard", st["title"]))
    story.append(
        Paragraph(
            "How the Website Was Built From Scratch — Technical Construction Guide",
            st["subtitle"],
        )
    )
    story.append(Paragraph(f"Document generated {now}", st["meta"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("1. Purpose and product scope", st["h1"]))
    story.append(
        Paragraph(
            "CryptoMacro is a client-side cryptocurrency and macro financial dashboard. "
            "It was designed as a 2026-ready SPA (single-page application) that works without "
            "a custom backend server: market data is pulled from public REST and WebSocket "
            "providers, portfolio state lives in the browser, and the site is published for free "
            "on GitHub Pages.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Primary product modules: live asset charts (crypto, equity, aggregates, pairs), "
            "Crypto Fear &amp; Greed (line + pie), multi-duration timeframes, Live Portfolio Tracker "
            "(USD/EUR), Shemitah cycle intelligence, and a multi-tier data failover layer.",
            st["body"],
        )
    )

    story.append(Paragraph("2. Technology stack", st["h1"]))
    story.append(
        table(
            [
                ["Layer", "Technology", "Why chosen"],
                ["UI framework", "React 19 + TypeScript", "Component model, type safety, wide ecosystem"],
                ["Build tool", "Vite 8", "Fast HMR, simple production bundling"],
                ["Styling", "Tailwind CSS v4", "Utility-first design tokens, dark theme"],
                ["Charts", "TradingView lightweight-charts", "Performant canvas candles / lines"],
                ["Server state", "TanStack Query", "Caching, retries, stale-while-revalidate"],
                ["Offline cache", "IndexedDB (idb)", "Persist candles &amp; portfolio offline"],
                ["Live prices", "Binance WebSocket", "Low-latency miniTicker stream"],
                ["Hosting", "GitHub Pages + Actions", "Free static hosting with CI deploy"],
                ["E2E tests", "Playwright (Chromium)", "UI + API regression suite"],
            ],
            [28 * mm, 45 * mm, 95 * mm],
            st,
        )
    )

    story.append(Paragraph("3. Project bootstrap (from zero)", st["h1"]))
    story.append(Paragraph("3.1 Scaffold", st["h2"]))
    story.append(
        Paragraph(
            "The application started as a Vite React-TypeScript project. Core commands:",
            st["body"],
        )
    )
    story.append(
        Preformatted(
            "npm create vite@latest CryptoDashboard -- --template react-ts\n"
            "cd CryptoDashboard\n"
            "npm install\n"
            "npm install @tanstack/react-query lightweight-charts idb clsx\n"
            "npm install -D tailwindcss @tailwindcss/vite @playwright/test",
            st["code"],
        )
    )
    story.append(Paragraph("3.2 Folder architecture", st["h2"]))
    story.append(
        Preformatted(
            "src/\n"
            "  components/   UI widgets (charts, nav, portfolio, shemitah)\n"
            "  constants/    Asset registry, timeframe maps, Shemitah data\n"
            "  context/      Live WebSocket price provider\n"
            "  hooks/        React Query + portfolio hooks\n"
            "  services/     financialApi, cache, fxRates, portfolioStore\n"
            "  types/        Shared domain TypeScript types\n"
            "e2e/            Playwright API + UI tests\n"
            "scripts/        Build-time SPX prefetch for GitHub Pages\n"
            "public/data/    Static SPX snapshot used as production backup",
            st["code"],
        )
    )

    story.append(Paragraph("4. Build steps — chronological feature construction", st["h1"]))

    steps = [
        (
            "Step A — Design tokens &amp; shell layout",
            "Defined dark fintech theme in <b>src/index.css</b> (Plus Jakarta Sans + IBM Plex Mono). "
            "Built <b>Dashboard</b>, <b>Sidebar</b>, <b>MobileNav</b>, sticky header and market ticker strip.",
        ),
        (
            "Step B — Asset registry",
            "Created <b>ASSETS</b> in <b>constants/assets.ts</b> for BTC/ETH/SOL/ADA, SPX, BTC.D/TOTAL/TOTAL2/TOTAL3, "
            "BTC pairs, and Fear &amp; Greed. Timeframes expanded to Hours 1–8, Days 1–7, Weeks 1–4, Months 1–12, Years 1–4, ALL.",
        ),
        (
            "Step C — Multi-tier financial API layer",
            "<b>services/financialApi.ts</b> normalizes all providers to Candle[]. "
            "Crypto/pairs: Binance REST (+ direct race) → CryptoCompare. "
            "Aggregates: shared Binance BTC/ETH base + CoinLore/Paprika global race. "
            "Equity: Yahoo multi-host/SPY → CORS proxies (prod) → build-time SPX snapshot. "
            "Fear &amp; Greed: alternative.me history.",
        ),
        (
            "Step D — Interactive charts",
            "<b>InteractiveChart</b> uses lightweight-charts (candles or line). "
            "TimeframeSelector is a two-step unit+count control. "
            "Shemitah bands/events overlay on BTC/SPX when toggled.",
        ),
        (
            "Step E — Live ticks",
            "<b>LiveTicksContext</b> opens one Binance combined miniTicker WebSocket for all binanceSymbol assets "
            "and fans prices into cards and the portfolio valuation engine.",
        ),
        (
            "Step F — Portfolio tracker",
            "LocalStorage + IndexedDB portfolio with amount held, optional avg buy price, USD/EUR FX "
            "(Frankfurter/ECB + CoinGecko backup), allocation bar/donut, live P&amp;L. "
            "No login. Export/import UI intentionally removed per product request; persistence remains automatic.",
        ),
        (
            "Step G — Security hardening",
            "CSP meta, referrer policy, nosniff. Portfolio JSON allow-list for asset ids, finite amount bounds, "
            "prototype pollution rejection. WebSocket messages validated (symbol allow-list, finite price). "
            "Shemitah overlay clears DOM without dangerous HTML injection of untrusted markup.",
        ),
        (
            "Step H — Free production deploy (GitHub only)",
            "GitHub Actions workflow builds with GITHUB_PAGES=true (base path /CryptoDashboard/), "
            "prefetches SPX snapshot, uploads Pages artifact. Live URL: "
            "https://trifmarius1.github.io/CryptoDashboard/",
        ),
        (
            "Step I — Automated QA",
            "Playwright suite under <b>e2e/</b> covers market APIs, navigation, charts, portfolio actions, "
            "security meta tags, and unique DOM ids. Run with <b>npm test</b>.",
        ),
    ]
    for title, body in steps:
        story.append(Paragraph(title, st["h2"]))
        story.append(Paragraph(body, st["body"]))

    story.append(Paragraph("5. Data flow (runtime)", st["h1"]))
    story.append(
        Preformatted(
            "Browser UI\n"
            "  ├─ TanStack Query ──► fetchCandles / fetchQuote / overview\n"
            "  │     ├─ memory cache (90s)\n"
            "  │     ├─ live REST (Binance / Yahoo / CoinLore / F&G / FX)\n"
            "  │     ├─ IndexedDB candle cache (failover)\n"
            "  │     └─ synthetic series (last resort)\n"
            "  ├─ WebSocket ──► LiveTicksContext ──► card prices + portfolio\n"
            "  └─ LocalStorage/IDB ──► portfolio holdings",
            st["code"],
        )
    )

    story.append(Paragraph("6. Local development &amp; production commands", st["h1"]))
    story.append(
        Preformatted(
            "npm install\n"
            "npm run dev          # http://127.0.0.1:5173 with Vite API proxies\n"
            "npm run prefetch:spx # refresh public/data/spx.json\n"
            "npm run build        # prefetch + tsc + vite build\n"
            "npm test             # Playwright E2E + API suite\n"
            "git push origin master  # triggers GitHub Pages deploy",
            st["code"],
        )
    )

    story.append(Paragraph("7. External APIs used", st["h1"]))
    story.append(
        table(
            [
                ["Provider", "Use", "Access path"],
                ["Binance REST + WS", "Crypto/pair OHLCV + live ticks", "Proxy in dev; direct in prod"],
                ["Yahoo Finance", "S&amp;P 500 / SPY", "Proxy in dev; multi-host + snapshot backup"],
                ["CoinLore / CoinPaprika", "Global mcap &amp; dominance", "Proxy / direct"],
                ["alternative.me", "Fear &amp; Greed history", "Proxy / direct"],
                ["Frankfurter (ECB)", "USD→EUR FX", "Proxy / direct"],
                ["CoinGecko", "Optional global/FX backup", "Rate-limited; not chart hot path"],
            ],
            [40 * mm, 55 * mm, 73 * mm],
            st,
        )
    )

    story.append(Paragraph("8. Known production constraints", st["h1"]))
    story.append(
        bullets(
            [
                "GitHub Pages is static: Vite <b>/api/*</b> proxies exist only in local dev.",
                "Yahoo often blocks browser CORS on Pages; build-time <b>spx.json</b> guarantees SPX charts.",
                "Third-party free CORS proxies are best-effort only and may rate-limit.",
                "Public market APIs can throttle under heavy traffic; caches mitigate short outages.",
                "This product is educational / informational — not financial advice.",
            ],
            st,
        )
    )

    story.append(Paragraph("9. Repository", st["h1"]))
    story.append(
        Paragraph(
            "Source: https://github.com/trifmarius1/CryptoDashboard<br/>"
            "Live site: https://trifmarius1.github.io/CryptoDashboard/",
            st["body"],
        )
    )
    return story


def build_testing(st):
    story = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph("CryptoMacro Dashboard", st["title"]))
    story.append(
        Paragraph(
            "Testing Report — Security Review, API Checks &amp; Playwright E2E",
            st["subtitle"],
        )
    )
    story.append(Paragraph(f"Report date {now}", st["meta"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("1. Objectives", st["h1"]))
    story.append(
        Paragraph(
            "Validate that the published dashboard works end-to-end: navigation, charts, portfolio, "
            "market APIs, and security controls. Failures found during automation were fixed and retested "
            "until the suite passed fully.",
            st["body"],
        )
    )

    story.append(Paragraph("2. Environment", st["h1"]))
    story.append(
        table(
            [
                ["Item", "Value"],
                ["App under test", "http://127.0.0.1:5173 (Vite dev, same code as production SPA)"],
                ["Browser automation", "Playwright Chromium"],
                ["Test runner", "npx playwright test (23 tests, 1 worker)"],
                ["Typecheck", "tsc -b"],
                ["Dependency audit", "npm audit → 0 vulnerabilities"],
                ["OS", "Windows"],
            ],
            [45 * mm, 123 * mm],
            st,
        )
    )

    story.append(Paragraph("3. Security review findings &amp; fixes", st["h1"]))
    story.append(
        table(
            [
                ["Area", "Finding", "Severity", "Fix / status"],
                [
                    "Dependencies",
                    "npm audit reported 0 known vulns",
                    "Info",
                    "No action required",
                ],
                [
                    "XSS / DOM",
                    "Shemitah overlay used layer.innerHTML = ''",
                    "Low",
                    "Replaced with removeChild loop; labels use textContent",
                ],
                [
                    "Portfolio storage",
                    "JSON parse accepted any assetId / large amounts",
                    "Medium",
                    "Allow-list asset ids from ASSETS, safeId regex, amount bounds, max 50 holdings, reject __proto__",
                ],
                [
                    "WebSocket",
                    "Trusted host only, but weak message validation",
                    "Medium",
                    "Validate symbol against subscription list, finite positive price, size cap",
                ],
                [
                    "Headers",
                    "Missing CSP / referrer policy",
                    "Medium",
                    "Added CSP meta, referrer strict-origin-when-cross-origin, nosniff",
                ],
                [
                    "Secrets",
                    "No API keys in client repo",
                    "Info",
                    "Public endpoints only — acceptable for this design",
                ],
                [
                    "Duplicate DOM ids",
                    "BTC/SPX cards duplicated in Shemitah section broke uniqueness",
                    "Medium",
                    "idSuffix='shemitah' for secondary cards",
                ],
                [
                    "Third-party CORS proxies",
                    "Used only as Yahoo backup in production",
                    "Low",
                    "Documented; static SPX snapshot is primary offline path",
                ],
            ],
            [32 * mm, 48 * mm, 22 * mm, 66 * mm],
            st,
        )
    )

    story.append(Paragraph("4. API tests (Playwright request context)", st["h1"]))
    story.append(
        Paragraph(
            "These hit the same Vite proxy routes the browser uses in development.",
            st["body"],
        )
    )
    story.append(
        table(
            [
                ["Test", "Endpoint / check", "Result"],
                ["Binance klines", "GET /api/binance/.../klines?symbol=BTCUSDT", "PASS"],
                ["Binance ticker", "GET 24hr ETHUSDT lastPrice &gt; 0", "PASS"],
                ["Yahoo SPX", "GET chart ^GSPC range=1y, ≥50 closes", "PASS"],
                ["CoinLore global", "total_mcap &amp; btc_d present", "PASS"],
                ["Fear &amp; Greed", "GET fng limit=10, value 0–100", "PASS"],
                ["Frankfurter FX", "USD→EUR rate in (0.5, 2)", "PASS"],
                ["SPX snapshot", "GET /data/spx.json (when present)", "PASS"],
            ],
            [40 * mm, 90 * mm, 38 * mm],
            st,
        )
    )

    story.append(Paragraph("5. UI / E2E tests (Playwright)", st["h1"]))
    story.append(
        table(
            [
                ["Test case", "How verified", "Result"],
                ["Dashboard shell", "Root mounts; CryptoMacro brand; section headings", "PASS"],
                ["Sidebar nav", "Macro / Portfolio / Shemitah buttons change main heading", "PASS"],
                ["Mobile nav", "4 tabs Home/Macro/Portfolio/Cycles; Settings absent", "PASS"],
                ["Settings removed", "No Settings button/heading; #settings does not open settings page", "PASS"],
                ["BTC chart", "#asset-btc-usd canvas + Years timeframe unit", "PASS"],
                ["SPX chart", "#asset-spx canvas visible", "PASS"],
                ["Fear &amp; Greed", "Canvas + pie SVG gauge", "PASS"],
                ["BTC.D aggregate", "Canvas on #asset-btc-d", "PASS"],
                ["Hours 1–8", "Hours unit exposes 1,2,4,8; select 4 keeps canvas", "PASS"],
                ["Months 1–12", "Months unit exposes 12; select 6 keeps canvas", "PASS"],
                ["Portfolio add/FX", "Add 0.01 BTC; toggle € EUR then $ USD", "PASS"],
                ["No export/import UI", "Export/Import/Clear buttons count = 0", "PASS"],
                ["Header tape", "Global MCap, BTC.D, S&amp;P 500, Fear &amp; Greed labels", "PASS"],
                ["CSP meta", "default-src 'self'; object-src 'none'", "PASS"],
                ["No http scripts", "No script[src^=http:]", "PASS"],
                ["Unique asset ids", "btc-usd/spx once; shemitah suffixed variants exist", "PASS"],
            ],
            [45 * mm, 95 * mm, 28 * mm],
            st,
        )
    )

    story.append(Paragraph("6. Defects found during testing &amp; retest", st["h1"]))
    story.append(
        table(
            [
                ["Defect", "Impact", "Resolution", "Retest"],
                [
                    "Duplicate #asset-btc-usd / #asset-spx",
                    "Broken a11y &amp; flaky selectors",
                    "AssetCard idSuffix for Shemitah copies",
                    "PASS — unique id test",
                ],
                [
                    "Portfolio currency button matched Remove BTC/USD",
                    "False positive click",
                    "Tests use exact '$ USD' / '€ EUR' names",
                    "PASS",
                ],
                [
                    "Heading /Live Portfolio/ matched two headings",
                    "Strict mode failure",
                    "Exact heading matchers",
                    "PASS",
                ],
            ],
            [48 * mm, 40 * mm, 50 * mm, 30 * mm],
            st,
        )
    )

    story.append(Paragraph("7. Final suite result", st["h1"]))
    story.append(
        Paragraph(
            "<b>23 / 23 tests passed</b> on Chromium after fixes and retest. "
            "API suite: 7 passed. UI/security suite: 16 passed. "
            "No failing cases remained at report generation time.",
            st["body"],
        )
    )
    story.append(
        Preformatted(
            "Command:\n  npx playwright test\n\nSummary:\n  23 passed\n  0 failed",
            st["code"],
        )
    )

    story.append(Paragraph("8. Manual checklist (smoke)", st["h1"]))
    story.append(
        bullets(
            [
                "Open live site on desktop and phone; charts paint within a few seconds.",
                "Change timeframe units on BTC and SPX; series updates.",
                "Add portfolio holding; total value and allocation update; USD/EUR switch reformats.",
                "Confirm Settings is absent from sidebar and mobile bar.",
                "Hard-refresh after deploy; SPX still renders (snapshot backup).",
            ],
            st,
        )
    )

    story.append(Paragraph("9. Conclusion", st["h1"]))
    story.append(
        Paragraph(
            "The dashboard meets functional expectations for navigation, market charts, portfolio tracking, "
            "and baseline web security for a public static SPA. Automated Playwright coverage now guards "
            "regressions on APIs, UI controls, and security meta tags. Remaining residual risks are external "
            "API rate limits and third-party CORS proxy availability for Yahoo in pure browser mode — "
            "mitigated by the SPX build snapshot and multi-provider crypto paths.",
            st["body"],
        )
    )
    return story


def write_pdf(path: Path, story_builder):
    st = styles()
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=20 * mm,
        title=path.stem,
        author="CryptoMacro build documentation",
    )
    doc.build(story_builder(st), onFirstPage=footer, onLaterPages=footer)
    print("wrote", path)


def main():
    write_pdf(OUT / "CryptoMacro_How_To_Build.pdf", build_howto)
    write_pdf(OUT / "CryptoMacro_Testing_Report.pdf", build_testing)


if __name__ == "__main__":
    main()
