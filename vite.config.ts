import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// GitHub Pages project site: https://<user>.github.io/CryptoDashboard/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/CryptoDashboard/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Yahoo Finance chart endpoint (S&P 500 / SPY)
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      // CoinGecko public REST
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
      },
      // CoinPaprika — free global snapshot backup
      '/api/coinpaprika': {
        target: 'https://api.coinpaprika.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coinpaprika/, ''),
      },
      // CoinLore — free global + per-coin mcap backup
      '/api/coinlore': {
        target: 'https://api.coinlore.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coinlore/, ''),
      },
      // Binance REST (CORS-safe via proxy for some environments)
      '/api/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/binance/, ''),
      },
      // CryptoCompare tertiary fallback
      '/api/cryptocompare': {
        target: 'https://min-api.cryptocompare.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cryptocompare/, ''),
      },
      // Fear & Greed Index
      '/api/fng': {
        target: 'https://api.alternative.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fng/, ''),
      },
      // ECB FX via Frankfurter (USD/EUR)
      '/api/fx': {
        target: 'https://api.frankfurter.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fx/, ''),
      },
    },
  },
})
