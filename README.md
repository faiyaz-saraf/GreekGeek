# GreekGeek Ω

Website Link: https://www.greekgeek.online/ 

Options Greeks simplified for any stock. Enter a ticker, pick an expiry and strike, and get plain-English breakdowns of Delta, Gamma, Theta, Vega, and Rho.

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Yahoo Finance (no API key required)
- Black-Scholes Greeks calculated server-side in TypeScript

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev
```

Open http://localhost:3000. No API keys, no sign-ups, works from anywhere.

## How it works

The API route fetches options chain data from Yahoo Finance (strike prices, expiry dates, implied volatility, stock price). Greeks are computed server-side using Black-Scholes formulas with these inputs:

- S = current stock price from `regularMarketPrice`
- K = strike price
- T = days to expiry / 365
- r = 0.045 (hardcoded risk-free rate)
- sigma = `impliedVolatility` from Yahoo Finance

All five Greeks (Delta, Gamma, Theta, Vega, Rho) are derived from the standard Black-Scholes model using the Abramowitz-Stegun approximation for the cumulative normal distribution.


## File Structure

```
/app
  /api/options/route.ts     Yahoo Finance proxy + Black-Scholes calculation
  /page.tsx                 Main page (client component)
  /layout.tsx               Root layout (dark theme, Geist font)
  /globals.css              Tailwind + custom animations
/components
  SearchBar.tsx             Ticker search input
  ExpiryStrikeSelector.tsx  Expiry and strike dropdowns
  CallPutToggle.tsx         Call/Put pill toggle
  GreekCard.tsx             Greek display card + explanation builder
  Tooltip.tsx               Hover/tap info tooltip
```
