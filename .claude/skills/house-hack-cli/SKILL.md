---
name: house-hack-cli
description: Run house-hack vs. S&P 500 comparisons using compare.cjs. Use when evaluating 3+ listings side by side, running sensitivity or stress-test analysis, or modeling a specific deal before making an offer. Pairs with house-hack-research, which produces the rA input. All variables not passed use defaults.json.
---

# House-Hack CLI

Run `node scripts/compare.cjs` with JSON overrides. Anything not passed uses
`scripts/defaults.json`. Pass only what you want to override.

## Process

1. Confirm inputs — at minimum `pA` (price) and `rA` (rent). If `rA` is
   missing or uncertain, invoke house-hack-research first.
2. Choose mode: single scenario, batch array, or sensitivity sweep.
3. Run the command and interpret the key output fields below.
4. Flag if `spBreakeven` is below 10 (deal has real merit) or above 13
   (S&P likely wins at historical returns).

## Invocation

```bash
# Single scenario — override only what differs from defaults
node scripts/compare.cjs '{"pA": 280000, "rA": 1200}'

# Batch — compare multiple scenarios
node scripts/compare.cjs '[{"pA": 250000, "rA": 900}, {"pA": 300000, "rA": 1200}]'

# Pipe from file
node scripts/compare.cjs < scenarios.json

# Year-by-year trajectory
node scripts/compare.cjs '{"pA": 280000}' --yearly

# Compact output (good for piping)
node scripts/compare.cjs '{"pA": 280000}' --compact
```

## Key Output Fields

| Field | What it means |
|-------|---------------|
| `winner` | Which strategy wins over the projection period |
| `spBreakeven` | S&P annual return % at which S&P catches the house-hack |
| `margin` | Dollar difference at end of projection |
| `marginPerYear` | margin / years — useful for quick sanity check |
| `underfunded` | True if starting capital is insufficient to close |
| `totalRentCollected` | Gross rent received over projection period |

## Defaults Reference

All values from `scripts/defaults.json`. Override any of these in your JSON payload.

### Personal Finance
| Variable | Default | Description |
|----------|---------|-------------|
| `startingCapital` | 50000 | Cash available on day 1 |
| `takeHome` | 2600 | Take-home pay per paycheck |
| `weeklyCost` | 75 | Groceries + gas per week |

### Mortgage Terms
| Variable | Default | Description |
|----------|---------|-------------|
| `downPct` | 3 | Down payment % |
| `rate` | 5.875 | Mortgage rate (% annual) |
| `taxPct` | 1.21 | Property tax (% annual) |
| `insPct` | 0.5 | Home insurance (% annual) |
| `pmiRate` | 0.5 | PMI rate (% annual of original loan) |
| `buyClosingCostPct` | 3 | Buyer closing cost % |

### Property Costs
| Variable | Default | Description |
|----------|---------|-------------|
| `utilities` | 500 | Monthly utilities |
| `hoa` | 0 | Monthly HOA |
| `maintVacancyPct` | 5 | Rent haircut for maintenance/vacancy % |
| `emergencyPct` | 1 | Emergency fund as % of price |
| `sellingCostPct` | 5 | Selling cost % (liquidation equity only) |

### Market & Timing
| Variable | Default | Description |
|----------|---------|-------------|
| `inflationRate` | 3.0 | General inflation % |
| `investRet` | 10 | S&P annual return % |
| `hackYears` | 2 | Years living in property while house-hacking |
| `years` | 10 | Total projection horizon |
| `tenantPaysUtils` | true | Tenant covers utilities after move-out |

### Option A: House-Hack Property
| Variable | Default | Description |
|----------|---------|-------------|
| `pA` | 300000 | Purchase price |
| `rA` | 1000 | Monthly rent during hack phase |
| `fullRentA` | 2400 | Monthly rent after move-out |
| `repA` | 0 | Upfront repairs |
| `appA` | 2.5 | Annual appreciation % |
| `rgA` | 2 | Annual rent growth % |
| `taxBenefitPct` | 0 | Depreciation tax savings as % of price (0.5 ≈ 22–24% bracket) |

### Phase 2 Personal Housing
| Variable | Default | Description |
|----------|---------|-------------|
| `phase2Mode` | "rent" | Housing mode after move-out: "rent" or "buy" |
| `phase2Utils` | 300 | Monthly utilities for personal residence |
| `phase2Rent` | 1000 | Monthly rent (rent mode) |
| `phase2RentGrowth` | 3 | Annual rent growth % (rent mode) |
| `phase2RenterIns` | 15 | Monthly renter's insurance (rent mode) |
| `phase2Price` | 350000 | Home price (buy mode) |
| `phase2DownPct` | 5 | Down payment % (buy mode) |
| `phase2MortRate` | 5.875 | Mortgage rate % (buy mode) |
| `phase2PmiRate` | 0.5 | PMI rate % (buy mode) |
| `phase2App` | 3 | Appreciation % (buy mode) |
| `phase2TaxPct` | 1.21 | Property tax % (buy mode) |
| `phase2InsPct` | 0.5 | Insurance % (buy mode) |
| `phase2Hoa` | 0 | Monthly HOA (buy mode) |

### Option B: Never Buy (S&P)
| Variable | Default | Description |
|----------|---------|-------------|
| `monthlyRent` | 1000 | Monthly rent paid |
| `rentInflation` | 3 | Annual rent inflation % |
| `renterIns` | 15 | Monthly renter's insurance |
| `renterUtils` | 300 | Monthly utilities |

## Deal Evaluation Patterns

### Quick viability check
```bash
node scripts/compare.cjs '{"pA": 310000, "rA": 1100, "fullRentA": 2400}'
```
Check `winner` and `spBreakeven`. Below 10 = real merit. Above 13 = S&P likely wins.

### Three-scenario batch from research output
```bash
node scripts/compare.cjs '[
  {"pA": 310000, "rA": 850,  "fullRentA": 2200},
  {"pA": 310000, "rA": 1100, "fullRentA": 2400},
  {"pA": 310000, "rA": 1350, "fullRentA": 2600}
]'
```

### Repair sensitivity
```bash
node scripts/compare.cjs '[
  {"pA": 310000, "rA": 1100, "repA": 0},
  {"pA": 310000, "rA": 1100, "repA": 10000},
  {"pA": 310000, "rA": 1100, "repA": 25000}
]'
```

### Timeline sensitivity
```bash
node scripts/compare.cjs '[
  {"pA": 310000, "rA": 1100, "years": 5},
  {"pA": 310000, "rA": 1100, "years": 10},
  {"pA": 310000, "rA": 1100, "years": 15}
]'
```
Short holds usually favor S&P because selling costs hurt early. Look for the crossover year.

### Phase 2: rent vs. buy after moving out
```bash
node scripts/compare.cjs '[
  {"pA": 310000, "rA": 1100, "phase2Mode": "rent", "phase2Rent": 1400},
  {"pA": 310000, "rA": 1100, "phase2Mode": "buy",  "phase2Price": 375000}
]'
```

### Appreciation sensitivity
```bash
node scripts/compare.cjs '[
  {"appA": 1.0}, {"appA": 2.0}, {"appA": 2.5},
  {"appA": 3.0}, {"appA": 4.0}, {"appA": 5.0}
]'
```

### Find where S&P wins
```bash
node scripts/compare.cjs '[
  {"investRet": 6}, {"investRet": 8},
  {"investRet": 10}, {"investRet": 12}
]'
```

### Stress test: worst case
```bash
node scripts/compare.cjs '{"rA": 0, "fullRentA": 0, "appA": 1, "investRet": 10}'
```

### Full deal model
```bash
node scripts/compare.cjs '{
  "pA": 310000,
  "rA": 1100,
  "fullRentA": 2400,
  "repA": 8000,
  "appA": 3.0,
  "taxPct": 1.21,
  "rate": 6.875,
  "downPct": 5,
  "hackYears": 2,
  "phase2Mode": "rent",
  "phase2Rent": 1400,
  "years": 10
}'
```