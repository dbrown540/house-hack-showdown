# House-Hack Showdown v5 Equations

This file documents the calculator variables and equations used in `src/App.jsx` and `src/utils/math.js`.

## 1) Inputs (state variables)

### Personal finance
- `startingCapital`: cash available on day 1.
- `takeHome`: take-home pay per paycheck.
- `weeklyCost`: groceries + gas per week.

### Property 1 mortgage terms
- `downPct`: down payment %.
- `rate`: mortgage rate (% annual).
- `taxPct`: property tax (% annual of home value).
- `insPct`: home insurance (% annual of home value).
- `pmiRate`: PMI rate (% annual of original loan; active while LTV > 80% and down < 20%).
- `buyClosingCostPct`: buyer closing cost %.

### Property costs
- `utilities`: monthly utilities for property 1.
- `hoa`: monthly HOA for property 1.
- `maintVacancyPct`: rent haircut for maintenance/vacancy.
- `emergencyPct`: emergency fund set-aside (% of price).
- `sellingCostPct`: selling cost % at exit (used for liquidation equity only).

### Market and timing
- `inflationRate`: annual inflation for variable expenses.
- `investRet`: annual portfolio return.
- `hackYears`: years living in property 1 while house-hacking.
- `years`: total projection horizon.
- `tenantPaysUtils`: after move-out, whether tenant covers property 1 utilities.

### Option A (house-hack property)
- `pA`: purchase price.
- `rA`: monthly rent during hack phase.
- `fullRentA`: monthly rent after move-out.
- `repA`: upfront repairs.
- `appA`: annual appreciation rate.
- `rgA`: annual rent growth.

### Phase 2 personal housing
- `phase2Mode`: `"rent"` or `"buy"`.
- Both modes: `phase2Utils` (monthly utilities for personal residence after move-out).
- Rent mode: `phase2Rent`, `phase2RentGrowth`, `phase2RenterIns` (monthly renter's insurance).
- Buy mode: `phase2Price`, `phase2DownPct`, `phase2MortRate`, `phase2PmiRate`, `phase2App`, `phase2TaxPct`, `phase2InsPct`, `phase2Hoa`.

### Option B (never buy)
- `monthlyRent`, `rentInflation`, `renterIns`, `renterUtils`.

## 2) Shared derived variables
- `livingMonthly = weeklyCost * 52 / 12`
- `monthlyIncome = takeHome * 2`
- `r = investRet / 100`
- Annual income growth is hardcoded: `curTakeHome = monthlyIncome * (1.03)^(y - 1)`

## 3) Core helper equations (`src/utils/math.js`)
- Mortgage payment:
  - `pmt(rate, nper, pv)` where `rate` is annual decimal and `nper` is years.
  - If `rate = 0`: `pv / (nper * 12)`
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
- Property 1 amortization monthly update (12x):
  - `balance = balance * (1 + monthlyR) - monthlyPI`, with `monthlyR = rate / 100 / 12`
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
  - Amortization each year:
    - `p2Balance = p2Balance * (1 + p2MonthlyR) - p2MonthlyPI` (12x), `p2MonthlyR = phase2MortRate / 100 / 12`
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

## 5) Option B equations (`calcNeverBuy`)
- Year 1:
  - `year1Expenses = monthlyRent + renterIns + renterUtils + livingMonthly`
  - `surplus0 = monthlyIncome - year1Expenses`
- For each year:
  - `inflFactor = (1 + inflationRate / 100)^(y - 1)`
  - `curRent = monthlyRent * (1 + rentInflation / 100)^(y - 1)`
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

## 7) v5 changelog (from v4)

1. **Compounding timing**: Changed from `(portfolio + surplus * 12) * (1 + r)` to mid-year approximation `portfolio * (1 + r) + surplus * 12 * (1 + r / 2)`. Existing balance gets full-year return; new contributions get half-year return on average.
2. **CAGR removed**: The prior CAGR metric was invalid with ongoing contributions (it conflated savings rate with asset return). Removed entirely.
3. **Phase-2 utilities fixed**: Personal utilities after move-out now use `phase2Utils` (separate input) instead of reusing property-1 `utilities`. Inflated from move-out year.
4. **Phase-2 renter's insurance added**: When `phase2Mode === "rent"`, `phase2RenterIns` is included in post-move-out expenses, matching Option B's treatment.
5. **Phase-2 buy reserves added**: `p2EmergencyFund = round(phase2Price * emergencyPct / 100)` deducted from portfolio at purchase, consistent with property-1.
6. **Hold equity as primary metric**: `totalWealth` now uses hold equity (`homeValue - balance`, no selling costs). Liquidation equity (`homeValue - balance - sellingCosts`) shown as secondary output. Charts and winner determination use hold equity.
7. **Underfunded warnings improved**: Both property-1 and phase-2 underfunded states are detected and surfaced with prominent warnings.
