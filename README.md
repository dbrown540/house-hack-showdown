# House-Hack Showdown v5

A single-page React financial comparison tool that models long-term wealth outcomes for **House-Hack (Option A)** vs. **Never Buy / rent + S&P 500 investing (Option B)**.

Live at: https://dannysmith.github.io/house-hack-showdown/

## Features

- **Two-phase house-hack model**: live in the property while collecting partial rent, then move out and collect full rent (or buy a second home)
- **Never Buy benchmark**: renter + S&P 500 compounding, using the same assumptions
- **Comprehensive calc engine**:
  - Mortgage PITI (Principal, Interest, Taxes, Insurance)
  - PMI auto-drop at 80% LTV
  - Upfront repairs and closing costs
  - Rental income with vacancy and maintenance reserves
  - Inflation on utilities, rent, and insurance
  - Home appreciation and mortgage paydown
  - Selling costs at liquidation
  - Compounding returns on leftover capital and monthly surpluses
- **Winner highlighting** and sensitivity analysis ("What Flips the Result")
- **CLI batch mode** for running scenarios without the UI

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm

### Installation

```bash
git clone https://github.com/dannysmith/house-hack-showdown.git
cd house-hack-showdown
npm install
```

### Development

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Production build to ./dist
npm run preview   # Preview production build locally
```

## CLI Batch Processing

Run comparisons without the UI using the built-in script engine:

```bash
# Run with all defaults
node scripts/compare.cjs

# Override specific variables
node scripts/compare.cjs '{"pA": 280000, "rA": 1200, "appA": 3}'

# Batch: compare multiple scenarios
node scripts/compare.cjs '[{"pA": 250000, "rA": 900}, {"pA": 300000, "rA": 1200}]'

# Include year-by-year data
node scripts/compare.cjs '{"pA": 280000}' --yearly
```

See [`scripts/SKILLS.md`](scripts/SKILLS.md) for the full variable reference, output schema, and common patterns.

## Built With

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Outfit Font](https://fonts.google.com/specimen/Outfit)
- [JetBrains Mono Font](https://fonts.google.com/specimen/JetBrains+Mono)

## License

MIT
