# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Production build to ./dist
npm run preview   # Preview production build
```

No test runner or linter is configured.

## Architecture

Single-page React + Vite financial calculator comparing two strategies over N years:
- **Option A (House-Hack)**: Buy property, collect rent, optionally buy a second home in Phase 2
- **Option B (Never Buy)**: Rent + invest surplus in S&P 500

### Key files

- **`src/App.jsx`** — The entire application in one component. Contains all state (40+ `useState` sliders), both calc engines (`calcBuy` and `calcNeverBuy`), the binary-search S&P breakeven solver (`calcNeverBuyWealth`), winner logic, sensitivity analysis, and all UI rendering. All styles are inline.
- **`src/utils/math.js`** — `pmt()` (mortgage payment), `calcRequiredMonthlyRent()` (gap-closing rent), and `fmt()` (currency formatter). Comment says "keep in sync with scripts/engine.cjs" (though scripts/ dir doesn't currently exist in repo).
- **`src/utils/constants.js`** — Color constants for Option A (green) and Option B (gold).
- **`src/components/Slider.jsx`** — Reusable range input with label, value display, and optional tooltip.
- **`src/components/Row3.jsx`** — Three-column comparison row (label | A | B) with winner highlighting.
- **`src/components/InfoTip.jsx`** — Hover tooltip component.
- **`equations.md`** — Authoritative reference for all calc variables, equations, and model assumptions. Consult this before modifying any financial logic.

### Calculation model

The two calc engines use mid-year compounding approximation: `portfolio * (1+r) + surplus*12 * (1+r/2)`. Option A has a two-phase model (hack phase where owner lives in property, then post-move-out with full rental income). Phase 2 supports either renting or buying a second property. Income growth is hardcoded at 3%/year. Winner comparison uses hold equity (no selling costs); liquidation equity is shown as a secondary metric.

### Deployment

Deployed to GitHub Pages. Vite `base` is set to `/house-hack-showdown/` in `vite.config.js`.
