# House-Hack Showdown v5 Equations

This file documents the calculator variables and equations used in `src/App.jsx` and `src/utils/math.js`.

## 1) Inputs (state variables)

### Personal finance
| Variable | UI Label | Description |
|----------|----------|-------------|
| `startingCapital` | Starting Capital | Cash available on day 1 |
| `takeHome` | Take-Home / Check | Take-home pay per paycheck |
| `weeklyCost` | Groceries + Gas / Wk | Weekly living cost (groceries + gas) |

### Property 1 mortgage terms
| Variable | UI Label | Description |
|----------|----------|-------------|
| `downPct` | Down Payment % | Down payment as % of price |
| `rate` | Mortgage Rate | Annual mortgage interest rate (%) |
| `taxPct` | Property Tax | Annual property tax as % of home value |
| `insPct` | Home Insurance % | Annual home insurance as % of home value |
| `pmiRate` | PMI Rate (if <20% down) | Annual PMI rate as % of original loan |
| `buyClosingCostPct` | Buy Closing Costs | Buyer closing cost as % of price |

### Property costs
| Variable | UI Label | Description |
|----------|----------|-------------|
| `utilities` | Property Utilities / Mo | Monthly utilities for property 1 |
| `hoa` | HOA / Mo (Property 1) | Monthly HOA for property 1 |
| `maintVacancyPct` | Maint. & Vacancy | Rent haircut % for maintenance/vacancy |
| `emergencyPct` | Emergency Fund % of Price | Emergency fund set-aside as % of price |
| `sellingCostPct` | Cost to Sell | Selling cost % (used for liquidation equity only) |

### Market and timing
| Variable | UI Label | Description |
|----------|----------|-------------|
| `inflationRate` | General Inflation | Annual inflation rate for variable expenses (%) |
| `investRet` | Investment Return | Annual portfolio return (%) |
| `hackYears` | House-Hack Years | Years living in property 1 while house-hacking |
| `years` | Projection Years | Total projection horizon |
| `tenantPaysUtils` | Tenant pays utilities after move-out | Toggle: whether tenant covers property 1 utilities after move-out |

### Option A (house-hack property)
| Variable | UI Label | Description |
|----------|----------|-------------|
| `pA` | Home Price | Purchase price |
| `rA` | Rental Income / Mo | Monthly rent collected during hack phase |
| `fullRentA` | Full Rent / Mo (after move-out) | Monthly rent after owner moves out |
| `repA` | Upfront Repairs | One-time repair cost at purchase |
| `appA` | Appreciation | Annual appreciation rate (%) |
| `rgA` | Rent Growth | Annual rent growth rate (%) |

### Phase 2 personal housing
| Variable | UI Label | Description |
|----------|----------|-------------|
| `phase2Mode` | Rent / Buy toggle | Phase 2 housing mode: `"rent"` or `"buy"` |
| `phase2Utils` | Phase 2 Utilities / Mo | Monthly utilities for personal residence after move-out (both modes) |
| `phase2Rent` | Phase 2 Personal Rent | Monthly rent in phase 2 (rent mode) |
| `phase2RentGrowth` | Phase 2 Rent Growth | Annual rent growth in phase 2 (%) (rent mode) |
| `phase2RenterIns` | Phase 2 Renter's Insurance / Mo | Monthly renter's insurance (rent mode) |
| `phase2Price` | Phase 2 Home Price | Purchase price of phase 2 home (buy mode) |
| `phase2DownPct` | Phase 2 Down Payment % | Down payment % for phase 2 home (buy mode) |
| `phase2MortRate` | Phase 2 Mortgage Rate | Mortgage rate for phase 2 home (%) (buy mode) |
| `phase2PmiRate` | Phase 2 PMI Rate (if <20% down) | PMI rate for phase 2 home (%) (buy mode) |
| `phase2App` | Phase 2 Appreciation | Annual appreciation for phase 2 home (%) (buy mode) |
| `phase2TaxPct` | Phase 2 Property Tax | Annual property tax for phase 2 home (%) (buy mode) |
| `phase2InsPct` | Phase 2 Home Insurance | Annual insurance for phase 2 home (%) (buy mode) |
| `phase2Hoa` | Phase 2 HOA / Mo | Monthly HOA for phase 2 home (buy mode) |

### Option B (never buy)
| Variable | UI Label | Description |
|----------|----------|-------------|
| `monthlyRent` | Monthly Rent | Monthly rent paid |
| `rentInflation` | Rent Inflation / Yr | Annual rent inflation rate (%) |
| `renterIns` | Renter's Insurance / Mo | Monthly renter's insurance |
| `renterUtils` | Utilities / Mo | Monthly utilities |

## 2) Shared derived variables
- `livingMonthly = weeklyCost * 52 / 12`
- `monthlyIncome = takeHome * 2`
- `r = investRet / 100`
- Annual income growth is hardcoded: `curTakeHome = monthlyIncome * (1.03)^(y - 1)`

## 3) Core helper equations (`src/utils/math.js`)
- Mortgage payment:
  - `pmt(rate, nper, pv)` where `rate` is annual decimal and `nper` is years.
  - If `rate = 0`: `pv / (nper * 12)` — monthly payment. (**Fixed in v5.1**: previously returned `pv / nper`, an annual amount.)
  - Else with `r_m = rate / 12`, `n = nper * 12`:
  - `payment = pv * (r_m * (1 + r_m)^n) / ((1 + r_m)^n - 1)`
- Required monthly rent to close wealth gap:
  - If `gap <= 0`: `0`
  - `r = annualRate / 100`
  - If `r = 0`: `round(gap / years / 12)`
  - Else: `annualExtra = (gap * r) / ((1 + r)^years - 1)`, return `round(annualExtra / 12)`

## 4) Option A equations (`calcBuy`)

### Day-1 setup
- `down = round(price * downPct / 100)`
- `loan = price - down`
- `monthlyPI = pmt(rate / 100, 30, loan)`
- `monthlyTax = round(price * taxPct / 100 / 12)`
- `monthlyIns = round(price * insPct / 100 / 12)`
- `totalPITI = monthlyPI + monthlyTax + monthlyIns`
- `buyClosingCosts = round(price * buyClosingCostPct / 100)`
- `emergencyFund = round(price * emergencyPct / 100)`
- `cashToClose = down + repairs + buyClosingCosts`
- `leftoverCapital = startingCapital - cashToClose - emergencyFund`
- `effectiveRentYear1 = rent * (1 - maintVacancyPct / 100)`
- `initialPMI = (downPct < 20) ? (pmiRate / 100) * loan / 12 : 0`
- `netHousing = totalPITI + initialPMI + hoa - effectiveRentYear1 + utilities`
- `totalExpenses = netHousing + livingMonthly`
- `surplus = monthlyIncome - totalExpenses`
- `housingPctGross = netHousing / monthlyIncome * 100`
- `portfolioValue` starts at `max(leftoverCapital, 0)`
- Year-0 equity:
  - `yr0HoldEq = down`
  - `yr0LiqEq = down - price * sellingCostPct / 100`

### Year loop (`y = 1..years`)
- Property 1 amortization monthly update (12x), then clamp:
  - `balance = balance * (1 + monthlyR) - monthlyPI`, with `monthlyR = rate / 100 / 12`
  - `balance = max(balance, 0)`
- Phase choice:
  - `inHackPhase = (y <= hackYears)`
- Inflation factor:
  - `inflFactor = (1 + inflationRate / 100)^(y - 1)`
- Rent:
  - `baseRent = inHackPhase ? rent : fullRent`
  - `rentGrowthYears = inHackPhase ? (y - 1) : (y - hackYears - 1)`
  - `curRent = baseRent * (1 + rentGrowth / 100)^(max(0, rentGrowthYears))`
  - `curEffRent = curRent * (1 - maintVacancyPct / 100)`
- Expense inflation:
  - `curUtils = utilities * inflFactor`
  - `curHoa = hoa * inflFactor`
  - `curLiving = livingMonthly * inflFactor`
  - `curTax = monthlyTax * inflFactor`
  - `curIns = monthlyIns * inflFactor`
  - `curPITI = monthlyPI + curTax + curIns`
- Property 1 PMI:
  - `curHomeValue = price * (1 + appRate / 100)^y`
  - `monthlyPMI = (balance > 0.8 * curHomeValue && downPct < 20) ? (pmiRate / 100) * loan / 12 : 0`

### Phase 2 housing
- Phase 2 inflation factor:
  - `p2YearsOut = y - hackYears - 1`
  - `p2InflFactor = (1 + inflationRate / 100)^(p2YearsOut)`
- Personal utilities (both rent and buy modes, uses phase-2-specific input):
  - `curPersonalUtils = inHackPhase ? 0 : phase2Utils * p2InflFactor`
- If `phase2Mode === "rent"` and not in hack phase:
  - `curPersonalHousing = phase2Rent * (1 + phase2RentGrowth / 100)^(p2YearsOut)`
  - `curPersonalRenterIns = phase2RenterIns * p2InflFactor`
- If `phase2Mode === "buy"`:
  - Transition year (`y = hackYears + 1`) setup:
    - `p2Down = round(phase2Price * phase2DownPct / 100)`
    - `p2ClosingCosts = round(phase2Price * buyClosingCostPct / 100)`
    - `p2EmergencyFund = round(phase2Price * emergencyPct / 100)`
    - `p2Loan = phase2Price - p2Down`
    - `p2MonthlyPI = pmt(phase2MortRate / 100, 30, p2Loan)`
    - `p2BaseTax = round(phase2Price * phase2TaxPct / 100 / 12)`
    - `p2BaseIns = round(phase2Price * phase2InsPct / 100 / 12)`
    - `p2Balance = p2Loan`
    - `p2TotalCash = p2Down + p2ClosingCosts + p2EmergencyFund`
    - `p2Underfunded = portfolioValue < p2TotalCash`
    - `portfolioValue -= p2TotalCash`
  - `curPersonalRenterIns = 0` (owner, not renter)
  - Amortization each year (then clamp):
    - `p2Balance = p2Balance * (1 + p2MonthlyR) - p2MonthlyPI` (12x), `p2MonthlyR = phase2MortRate / 100 / 12`
    - `p2Balance = max(p2Balance, 0)`
  - Year cost:
    - `p2HomeValue = phase2Price * (1 + phase2App / 100)^(y - hackYears)`
    - `p2MonthlyPMI = (p2Balance > 0.8 * p2HomeValue && phase2DownPct < 20) ? (phase2PmiRate / 100) * p2Loan / 12 : 0`
    - `curPersonalHousing = p2MonthlyPI + p2BaseTax * p2InflFactor + p2BaseIns * p2InflFactor + phase2Hoa * p2InflFactor + p2MonthlyPMI`

### Annual wealth update
- `ownerUtils = (inHackPhase || !tenantPaysUtils) ? curUtils : 0`
- `curNet = curPITI + monthlyPMI + curHoa - curEffRent + ownerUtils + curPersonalHousing + curPersonalUtils + curPersonalRenterIns`
- `curSurplus = curTakeHome - (curNet + curLiving)`
- Portfolio compounding (mid-year approximation — existing balance gets full-year return, new contributions get half-year return):
  - `portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2)`
- Property 1 equity (hold = primary, liquidation = secondary):
  - `curHoldEq = curHomeValue - balance`
  - `curLiqEq = curHomeValue - balance - curHomeValue * sellingCostPct / 100`
- Phase 2 equity (if buy mode active):
  - `p2HoldEquity = p2HomeValue - p2Balance`
  - `p2LiqEquity = p2HomeValue - p2Balance - p2HomeValue * sellingCostPct / 100`
- Total wealth:
  - `totalWealth(y) = portfolioValue + curHoldEq + p2HoldEquity` (primary, hold-based)
  - `totalWealthLiq(y) = portfolioValue + curLiqEq + p2LiqEquity` (secondary, liquidation-based)

### Final outputs
- `homeValue = price * (1 + appRate / 100)^years`
- `grossEquity = homeValue - balance`
- `sellingCost = homeValue * sellingCostPct / 100`
- `netEquityHold = grossEquity` (hold equity, no selling costs — primary)
- `netEquityLiq = grossEquity - sellingCost` (liquidation equity — secondary)
- If phase 2 buy:
  - `p2FinalHomeValue = phase2Price * (1 + phase2App / 100)^(years - hackYears)`
  - `p2FinalSellingCost = p2FinalHomeValue * sellingCostPct / 100`
  - `p2FinalNetEquityHold = p2FinalHomeValue - p2Balance`
  - `p2FinalNetEquityLiq = p2FinalHomeValue - p2Balance - p2FinalSellingCost`
- `totalWealth = portfolioValue + netEquityHold + p2FinalNetEquityHold` (primary)
- `totalWealthLiq = portfolioValue + netEquityLiq + p2FinalNetEquityLiq` (secondary)
- `principalPaid = loan - balance`
- `appreciationGain = homeValue - price`
- `underfunded = (leftoverCapital < 0)` — results assume $0 initial portfolio if true
- `p2Underfunded = portfolioValue < p2TotalCash` at transition year — results may be unreliable if true
- `surplusChk = round(surplus / 2)` (per-paycheck surplus display)

### Output variable → UI label mapping (comparison table)

| Variable | UI Label | Shown For |
|----------|----------|-----------|
| `cashToClose` | Cash to Close | A only |
| `buyClosingCosts` | Buy Closing Costs | A only |
| `emergencyFund` | Emergency Fund (set aside) | A only |
| `leftoverCapital` | Leftover Capital → Invested Day 1 | A = leftover, B = startingCapital |
| `totalPITI` | Mortgage PITI | A only |
| `hoaYear1` | HOA Fees | A only |
| `monthlyRent` | Rent Paid | B only |
| `effectiveRentYear1` | Effective Rental Income | A only |
| `housingPctGross` | Housing % of Take-Home | A and B |
| `netHousing` | Net Housing Cost | A and B |
| `totalExpenses` | Total Monthly Expenses | A and B |
| `surplus` | Monthly Surplus → Invest | A and B |
| `surplusChk` | Surplus / Check | A and B |
| `homeValue` | Home Value (Property 1) | A only |
| `balance` | Remaining Mortgage (Property 1) | A only |
| `principalPaid` | Principal Paid (equity earned) | A only |
| `appreciationGain` | Appreciation Gain | A only |
| `grossEquity` | Hold Equity (Property 1) | A only |
| `sellingCost` | Cost to Sell (X%) | A only |
| `netEquityLiq` | Liquidation Equity (Property 1) | A only |
| `p2HomeValue` | Phase 2 Home Value | A only (if phase2Mode=buy) |
| `p2Balance` | Phase 2 Remaining Mortgage | A only (if phase2Mode=buy) |
| `p2NetEquity` | Phase 2 Hold Equity | A only (if phase2Mode=buy) |
| `p2SellingCost` | Phase 2 Cost to Sell (X%) | A only (if phase2Mode=buy) |
| `p2NetEquityLiq` | Phase 2 Liquidation Equity | A only (if phase2Mode=buy) |
| `p2CashToClose` | Phase 2 Cash to Close | A only (if phase2Mode=buy) |
| `netEquity + p2NetEquity` | Combined Hold Equity | A only (if phase2Mode=buy) |
| `totalRentCollected` | Total Rent Collected | A only |
| `totalRentPaid` | Total Rent Paid | B only |
| `portfolioValue` | Investment Portfolio | A and B |
| `totalWealth` | HOLD NET WORTH | A and B (primary comparison) |
| `totalWealthLiq` | LIQUIDATION NET WORTH | A and B (secondary) |

## 5) Option B equations (`calcNeverBuy`)
- `portfolioValue` starts at `startingCapital`
- Year 1 snapshot:
  - `netHousing = round(monthlyRent + renterIns + renterUtils)`
  - `totalExpenses = round(monthlyRent + renterIns + renterUtils + livingMonthly)`
  - `year1Expenses = monthlyRent + renterIns + renterUtils + livingMonthly`
  - `surplus0 = monthlyIncome - year1Expenses`
- For each year (`y = 1..years`):
  - `inflFactor = (1 + inflationRate / 100)^(y - 1)`
  - `curRent = monthlyRent * (1 + rentInflation / 100)^(y - 1)`
  - `totalRentPaid += curRent * 12`
  - `curTakeHome = monthlyIncome * (1.03)^(y - 1)`
  - `curRenterIns = renterIns * inflFactor`
  - `curRenterUtils = renterUtils * inflFactor`
  - `curLiving = livingMonthly * inflFactor`
  - `curExpenses = curRent + curRenterIns + curRenterUtils + curLiving`
  - `curSurplus = curTakeHome - curExpenses`
  - `portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2)` (mid-year approximation)
- `housingPctGross = (monthlyRent + renterUtils) / monthlyIncome * 100`
- `totalWealth = portfolioValue` (no home equity term)
- `surplusChk = round(surplus0 / 2)`

## 6) Comparison and decision equations
- `allW = [a.totalWealth, b.totalWealth]` (uses hold-based wealth)
- `maxW = max(allW)`, `winIdx = indexOf(maxW)`
- `margin = abs(a.totalWealth - b.totalWealth)`
- `loserW = min(allW)`
- `marginPct = loserW > 0 ? (margin / loserW) * 100 : 0`
- `marginPerYear = margin / years`
- S&P breakeven return (binary search):
  - Solve `calcNeverBuyWealth(return) ~= a.totalWealth` over `[0, 50]`, 50 iterations.
  - Uses same mid-year compounding: `pv = pv * (1 + cr) + curSurplus * 12 * (1 + cr / 2)`

## 8) Model Assumptions and Known Simplifications

These assumptions are intentional model choices, not bugs. Each entry describes the implementation, the rationale, and the real-world alternative for context.

### 1. PMI drop uses current appreciated value
- **Implementation:** `monthlyPMI = balance > 0.8 * curHomeValue ? ... : 0` — where `curHomeValue` is the appreciated value at year `y`.
- **Why:** Simpler to implement; no additional input needed.
- **Effect:** In high-appreciation scenarios PMI drops faster than it would under real-world rules, slightly favoring Option A.
- **Real-world alternative:** Lenders typically require PMI until the loan-to-value ratio reaches 80% of the *original appraised value*, unless a formal reappraisal is ordered.

### 2. Emergency fund never compounds
- **Implementation:** `emergencyFund = round(price * emergencyPct / 100)` is deducted from `startingCapital` and excluded from `portfolioValue` permanently.
- **Why:** Conservative assumption — treats the emergency fund as illiquid and unavailable for investment.
- **Effect:** Slightly disadvantages Option A vs. a model where the emergency fund earns a return.
- **Real-world alternative:** Emergency funds held in HYSA or money-market accounts do earn returns (typically 4–5% as of 2024).

### 3. Income growth hardcoded at 3% per year
- **Implementation:** `curTakeHome = monthlyIncome * (1.03)^(y - 1)` in both `calcBuy` and `calcNeverBuy`.
- **Why:** Reflects long-run nominal wage growth without adding another slider.
- **Effect:** When `inflationRate > 3`, real income declines in the model. Income growth is independent of the `inflationRate` input.
- **Real-world alternative:** A configurable income growth slider would let users model faster or slower wage trajectories.

### 4. Vacancy/maintenance rate applied uniformly across phases
- **Implementation:** `curEffRent = curRent * (1 - maintVacancyPct / 100)` applies the same rate in Phase 1 (owner-occupied, partial rent) and Phase 2 (full rental).
- **Why:** Single input keeps the model simple; vacancy risk was judged similar enough across phases for default parameters.
- **Effect:** Phase 1 vacancy risk may be understated (owner is present, fewer vacancy gaps) or overstated depending on property type.
- **Real-world alternative:** Separate maintenance and vacancy rates for each phase.

### 5. Winner comparison uses hold equity (no selling costs)
- **Implementation:** `totalWealth = portfolioValue + homeValue - balance`. Liquidation equity (`homeValue - balance - sellingCosts`) is computed and displayed as a secondary metric but is not used for the winner determination.
- **Why:** Assumes the property is held at the evaluation horizon, not sold. Selling costs are transaction costs, not wealth destruction.
- **Effect:** Option A's winning margin is slightly higher than it would be if liquidation equity were the primary metric. The liquidation net worth row makes the after-costs position visible.
- **Real-world alternative:** Some models use liquidation equity as the primary metric to reflect realistic exit value.

---

## 7) v5 changelog (from v4)

1. **Compounding timing**: Changed from `(portfolio + surplus * 12) * (1 + r)` to mid-year approximation `portfolio * (1 + r) + surplus * 12 * (1 + r / 2)`. Existing balance gets full-year return; new contributions get half-year return on average.
2. **CAGR removed**: The prior CAGR metric was invalid with ongoing contributions (it conflated savings rate with asset return). Removed entirely.
3. **Phase-2 utilities fixed**: Personal utilities after move-out now use `phase2Utils` (separate input) instead of reusing property-1 `utilities`. Inflated from move-out year.
4. **Phase-2 renter's insurance added**: When `phase2Mode === "rent"`, `phase2RenterIns` is included in post-move-out expenses, matching Option B's treatment.
5. **Phase-2 buy reserves added**: `p2EmergencyFund = round(phase2Price * emergencyPct / 100)` deducted from portfolio at purchase, consistent with property-1.
6. **Hold equity as primary metric**: `totalWealth` now uses hold equity (`homeValue - balance`, no selling costs). Liquidation equity (`homeValue - balance - sellingCosts`) shown as secondary output. Charts and winner determination use hold equity.
7. **Underfunded warnings improved**: Both property-1 and phase-2 underfunded states are detected and surfaced with prominent warnings.
