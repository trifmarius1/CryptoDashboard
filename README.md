# CryptoMacro — Cryptocurrency & Macro Financial Dashboard

Modern, mobile-first Web3/FinTech dashboard (2026 standards) covering:

- **Crypto USD pairs:** BTC, ETH, SOL, ADA  
- **Equity benchmark:** S&P 500 (SPX) with 52-week range  
- **Aggregates:** BTC.D, TOTAL, TOTAL2, TOTAL3  
- **BTC pairs:** ETH/BTC, SOL/BTC, ADA/BTC  
- **Shemitah 7-year cycle overlay** + educational intelligence widget  

## Stack

- React 19 + TypeScript + Vite  
- Tailwind CSS v4 (`@theme`, fluid type, `dvh`)  
- TradingView **lightweight-charts**  
- TanStack Query  
- IndexedDB (`idb`) offline candle cache  

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Architecture

```
src/
  components/     # UI: charts, cards, ticker, Shemitah, nav
  constants/      # Asset registry, Shemitah reference data
  hooks/          # React Query + WebSocket hooks
  services/       # financialApi, cache, shemitah engine
  types/          # Shared TypeScript domain types
```

### Data failover

1. **Tier 1** — Binance WebSocket mini-tickers  
2. **Tier 2** — Binance REST / CoinGecko / Yahoo Finance (via Vite proxy)  
3. **Tier 3** — CryptoCompare REST  
4. **Offline** — IndexedDB (1,000 candles per asset × timeframe) + graceful banner  

### Shemitah overlay

Toggle **Shemitah** on BTC / SPX multi-year charts to paint 7-year sabbatical bands and historical event markers (1987, 2001, 2008, 2015, 2021–22, 2028–29). Analytics are **educational only** — see in-app disclaimer.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Local dev server         |
| `npm run build`| Production build         |
| `npm run preview` | Preview production    |

## Free online deploy (Vercel)

This app is a static SPA. Market APIs are proxied in production via `vercel.json` (same routes as local Vite).

1. Open [vercel.com](https://vercel.com) and sign in with **GitHub** (free Hobby plan).
2. **Add New Project** → import `trifmarius1/CryptoDashboard`.
3. Leave defaults:
   - Framework: Vite  
   - Build: `npm run build`  
   - Output: `dist`
4. Click **Deploy**.

You get a free HTTPS URL like `https://crypto-dashboard-….vercel.app`.  
Every push to `master` redeploys automatically.

Optional: add a custom domain under Project → Settings → Domains (free on Hobby).

### Other free options

| Host | Notes |
|------|--------|
| **Netlify** | Same idea; add redirect/proxy rules for `/api/*` |
| **Cloudflare Pages** | Free CDN; use Workers for API proxy if needed |
| **GitHub Pages** | Free static only — **not recommended** without rewriting API calls (CORS) |

## Disclaimer

Not financial advice. Market data may be delayed. Shemitah metrics are historical-cycle / educational overlays for research and backtesting context only.
