# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

House-Hack Showdown v3.1 — a single-page React financial comparison tool that models long-term wealth outcomes across three strategies: Buy Cheap (house-hack), Buy Better (premium property), and Never Buy (rent + S&P 500 investing).

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
- **`calcBuy(price, rent, repairs, appRate, rentGrowth)`** — year-by-year financial model for buy scenarios (mortgage PITI, inflation, vacancy, appreciation, selling costs, investment compounding)
- **`calcNeverBuy()`** — renter + S&P model using closure over shared state
- **`useMemo`** caches results for Options A, B, C; a winner is determined by comparing total wealth

Supporting files:
- `src/utils/math.js` — `pmt()` (mortgage payment), `calcRequiredMonthlyRent()`, `fmt()` (currency formatting — always use this for dollar display)
- `src/utils/constants.js` — color palette (`COLORS.A/B/C`) and background helpers
- `src/components/Slider.jsx` — reusable range input
- `src/components/Row3.jsx` — three-column comparison row with winner highlighting

## Conventions

- Inline CSS-in-JSX styling with CSS variables for typography (`--mono`, `--body`)
- PascalCase components, camelCase functions/variables
- `calcBuy`/`calcNeverBuy` are the source of truth for financial modeling — when modifying, ensure Verdict, Insights, and "What Flips" sections stay logically consistent
