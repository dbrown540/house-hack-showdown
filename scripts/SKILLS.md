# House-Hack Showdown — CLI Batch Processing

Run house-hack vs. S&P 500 comparisons without the UI. All calculations mirror the v5 web app exactly.

## Quick Start

```bash
# Run with all defaults
node scripts/compare.cjs

# Override specific variables
node scripts/compare.cjs '{"pA": 280000, "rA": 1200, "appA": 3}'

# Batch: compare multiple scenarios
node scripts/compare.cjs '[{"pA": 250000, "rA": 900}, {"pA": 300000, "rA": 1200}]'

# Pipe from file
node scripts/compare.cjs < scenarios.json

# Include year-by-year data
node scripts/compare.cjs '{"pA": 280000}' --yearly

# Compact single-line output (good for piping)
node scripts/compare.cjs '{"pA": 280000}' --compact
```

## All Variables

Any variable not provided uses the default from `scripts/defaults.json`. Pass only what you want to override.

### Personal Finance

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `startingCapital` | 50000 | 5,000–300,000 | Cash available on day 1 |
| `takeHome` | 2600 | 1,500–8,000 | Take-home pay per paycheck |
| `weeklyCost` | 75 | 50–200 | Groceries + gas per week |

### Mortgage Terms (Property 1)

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `downPct` | 3 | 0–20 | Down payment % |
| `rate` | 5.875 | 4–8 | Mortgage rate (% annual) |
| `taxPct` | 1.21 | 0.5–2 | Property tax (% annual) |
| `insPct` | 0.5 | 0.2–1.5 | Home insurance (% annual) |
| `pmiRate` | 0.5 | 0–1.5 | PMI rate (% annual of original loan) |
| `buyClosingCostPct` | 3 | 0–6 | Buyer closing cost % |

### Property Costs

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `utilities` | 500 | 150–1,200 | Monthly utilities for property 1 |
| `hoa` | 0 | 0–1,200 | Monthly HOA for property 1 |
| `maintVacancyPct` | 5 | 0–20 | Rent haircut for maintenance/vacancy % |
| `emergencyPct` | 1 | 0–5 | Emergency fund as % of price |
| `sellingCostPct` | 5 | 0–10 | Selling cost % (liquidation equity only) |

### Market & Timing

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `inflationRate` | 3.0 | 0–8 | General inflation % |
| `investRet` | 10 | 4–12 | S&P annual return % |
| `hackYears` | 2 | 0–10 | Years living in property while house-hacking |
| `years` | 10 | 5–40 | Total projection horizon |
| `tenantPaysUtils` | true | true/false | Tenant covers property 1 utilities after move-out |

### Option A: House-Hack Property

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `pA` | 300000 | 100,000–750,000 | Purchase price |
| `rA` | 1000 | 0–4,000 | Monthly rent during hack phase |
| `fullRentA` | 2400 | 0–5,000 | Monthly rent after move-out |
| `repA` | 0 | 0–50,000 | Upfront repairs |
| `appA` | 2.5 | 0–6 | Annual appreciation % |
| `rgA` | 2 | 0–5 | Annual rent growth % |
| `taxBenefitPct` | 0 | 0–1.5 | Annual depreciation tax savings as % of purchase price (0 = no tax effect; 0.5 ≈ typical 22–24% bracket) |

### Phase 2 Personal Housing

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `phase2Mode` | "rent" | "rent"/"buy" | Housing mode after move-out |
| `phase2Utils` | 300 | 0–600 | Monthly utilities for personal residence |
| `phase2Rent` | 1000 | 0–3,000 | Monthly rent (rent mode) |
| `phase2RentGrowth` | 3 | 0–6 | Annual rent growth % (rent mode) |
| `phase2RenterIns` | 15 | 0–50 | Monthly renter's insurance (rent mode) |
| `phase2Price` | 350000 | 100,000–750,000 | Home price (buy mode) |
| `phase2DownPct` | 5 | 0–20 | Down payment % (buy mode) |
| `phase2MortRate` | 5.875 | 4–8 | Mortgage rate % (buy mode) |
| `phase2PmiRate` | 0.5 | 0–1.5 | PMI rate % (buy mode) |
| `phase2App` | 3 | 0–6 | Appreciation % (buy mode) |
| `phase2TaxPct` | 1.21 | 0.5–2 | Property tax % (buy mode) |
| `phase2InsPct` | 0.5 | 0.2–1.5 | Insurance % (buy mode) |
| `phase2Hoa` | 0 | 0–1,200 | Monthly HOA (buy mode) |

### Option B: Never Buy (S&P)

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `monthlyRent` | 1000 | 500–2,500 | Monthly rent paid |
| `rentInflation` | 3 | 0–6 | Annual rent inflation % |
| `renterIns` | 15 | 10–50 | Monthly renter's insurance |
| `renterUtils` | 300 | 0–1,200 | Monthly utilities |

## Output Schema

### Single Scenario

```json
{
  "params": { /* only the overrides you passed */ },
  "result": {
    "winner": "House-Hack" | "Never Buy (S&P)",
    "winnerLabel": "A" | "B",
    "margin": 95272,
    "marginPct": 11.4,
    "marginPerYear": 9527,
    "spBreakeven": 12.3,
    "houseHack": {
      "totalWealth": 925848,
      "totalWealthLiq": 906247,
      "portfolioValue": 612345,
      "netEquity": 313503,
      "netEquityLiq": 293902,
      "homeValue": 384043,
      "balance": 70540,
      "surplus": 1250,
      "cashToClose": 18000,
      "leftoverCapital": 29000,
      "underfunded": false,
      "totalRentCollected": 245000,
      "annualTaxBenefit": 0,
      "p2NetEquity": 0,
      "p2Underfunded": false,
      "roi": { "totalGain": 875848, "totalROI": 1751.7, "annualizedROI": 33.8, "wealthMultiple": 18.52 },
      "roiLiq": { "totalGain": 856247, "totalROI": 1712.5, "annualizedROI": 33.5, "wealthMultiple": 18.12 }
    },
    "neverBuy": {
      "totalWealth": 830576,
      "portfolioValue": 830576,
      "surplus": 2100,
      "totalRentPaid": 137567,
      "roi": { "totalGain": 780576, "totalROI": 1561.2, "annualizedROI": 32.0, "wealthMultiple": 16.61 }
    }
  }
}
```

### Batch Mode

Returns an array of the above, each with an additional `scenario` field (1-indexed). A summary table is printed to stderr.

## Common Patterns

### Compare multiple listings

```bash
node scripts/compare.cjs '[
  {"pA": 250000, "rA": 900,  "fullRentA": 2000, "appA": 2.5},
  {"pA": 300000, "rA": 1200, "fullRentA": 2400, "appA": 2.5},
  {"pA": 350000, "rA": 1500, "fullRentA": 2800, "appA": 3.0}
]'
```

### Sensitivity analysis (appreciation from 1% to 5%)

```bash
node scripts/compare.cjs '[
  {"appA": 1.0},
  {"appA": 2.0},
  {"appA": 3.0},
  {"appA": 4.0},
  {"appA": 5.0}
]'
```

### Find where S&P wins (varying investment return)

```bash
node scripts/compare.cjs '[
  {"investRet": 6},
  {"investRet": 8},
  {"investRet": 10},
  {"investRet": 12}
]'
```

### Test a specific deal with phase-2 buy

```bash
node scripts/compare.cjs '{
  "pA": 275000,
  "rA": 1100,
  "fullRentA": 2200,
  "repA": 5000,
  "appA": 3,
  "phase2Mode": "buy",
  "phase2Price": 400000,
  "phase2DownPct": 5,
  "years": 15
}'
```

### Stress test: zero rent, low appreciation

```bash
node scripts/compare.cjs '{"rA": 0, "fullRentA": 0, "appA": 1, "investRet": 10}'
```
