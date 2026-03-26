# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

House-Hack Showdown v5 — a single-page React financial comparison tool that models long-term wealth outcomes for House-Hack vs. Never Buy (rent + S&P 500 investing).

## Commands

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Production build to ./dist
npm run preview   # Preview production build locally
```

No test framework is configured. Validate changes by running the app and checking the Verdict/Insights sections for consistency.

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml` (Node 20, Vite build, uploads `dist/`). The Vite base path is set to `/house-hack-showdown/`.

## Architecture

All app logic lives in a single component (`src/App.jsx`):
- **28 `useState` hooks** manage all inputs (shared assumptions + per-option sliders)
- **`calcBuy(price, rent, fullRent, repairs, appRate, rentGrowth)`** — year-by-year financial model for buy scenarios with two phases:
  - **Phase 1 (house-hack)**: owner lives in property, collects partial rent; length controlled by `hackYears`
  - **Phase 2**: owner moves out, collects full rent (`fullRent`), pays personal rent elsewhere (`phase2Rent`)
  - Models mortgage PITI, inflation, vacancy/maintenance reserves, appreciation, selling costs, and investment compounding on surpluses
- **`calcNeverBuy()`** — renter + S&P model using closure over shared state
- **`useMemo`** caches results for Options A, B, C; a winner is determined by comparing `totalWealth`
- **`wHigh` / `wLow`** — helpers that return the index (0/1/2) of the best value for a row, used by `Row3` for winner highlighting

Supporting files:
- `src/utils/math.js` — `pmt()` (mortgage payment), `calcRequiredMonthlyRent()`, `fmt()` (currency formatting — always use this for dollar display)
- `src/utils/constants.js` — color palette (`COLORS.A/B/C`) and background helpers
- `src/components/Slider.jsx` — reusable range input
- `src/components/Row3.jsx` — three-column comparison row with winner highlighting

## Conventions

- Inline CSS-in-JSX styling with CSS variables for typography (`--mono`, `--body`)
- PascalCase components, camelCase functions/variables
- `calcBuy`/`calcNeverBuy` are the source of truth for financial modeling — when modifying, ensure Verdict, Insights, and "What Flips" sections stay logically consistent
- Income growth is hardcoded at 3% annually (`Math.pow(1.03, y-1)`) in both calc functions — not tied to the `inflationRate` slider
- Both calc functions return the same object shape so `Row3` can display any option uniformly

## Batch Processing

See `scripts/SKILLS.md` for running comparisons without the UI via `node scripts/compare.cjs`. The CLI engine is a standalone copy of the calc logic (not imported by the UI) — keep them in sync when formulas change.
