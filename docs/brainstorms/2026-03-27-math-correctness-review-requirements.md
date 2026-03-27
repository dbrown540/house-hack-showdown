---
date: 2026-03-27
topic: math-correctness-review
---

# Math Correctness Review Spec — House-Hack Showdown v5

## Problem Frame

Before modifying or publishing the financial model, a structured correctness review is needed to confirm the calculation engine is internally consistent, free of known formula errors, and comparable across Option A (house-hack) and Option B (never buy / S&P 500). This spec defines the contract, invariants, edge cases, and test plan for that review.

---

## Correctness Contract

### C1. Apples-to-Apples Comparison

- Both options start with the same `startingCapital`.
- Option A: invests `max(startingCapital - cashToClose - emergencyFund, 0)` on day 1.
- Option B: invests full `startingCapital` on day 1.
- The gap is deliberate and correct — buying a house costs cash. The reviewer must confirm the `underfunded` warning fires correctly when `leftoverCapital < 0`.
- Emergency fund is permanently locked up (never compounding, never returned). This is a conservative assumption that disadvantages A.

### C2. Terminal Wealth Definition

- **Primary metric** (`totalWealth`): portfolioValue + hold equity (no selling costs).
- **Secondary metric** (`totalWealthLiq`): portfolioValue + liquidation equity (selling costs deducted).
- Winner determination uses `totalWealth` (hold equity). This is a model choice, not a bug, but must be confirmed intentional and documented for users.
- Option B: `totalWealth = portfolioValue` (no equity component). `totalWealthLiq = portfolioValue` (identical — no selling costs for renters). This is correct.

### C3. Surplus Compounding

Both options use identical mid-year approximation:

```
portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2)
```

- Existing balance: full annual return `r`.
- New contributions (curSurplus × 12): half-year return `r/2`.
- **Risk**: When `curSurplus < 0` (negative cash flow), the formula applies `(1 + r/2)` to a negative contribution. This slightly amplifies losses vs. a pure mid-year withdrawal assumption. The magnitude is small for modest negative surpluses but should be understood.

### C4. Income Growth

Both calcs use `curTakeHome = monthlyIncome * 1.03^(y-1)`, hardcoded at 3%/year. This is intentionally separate from `inflationRate`. **Confirm** this is correct — if `inflationRate` is set high (e.g. 8%), the income growth rate still stays at 3%, which may understate income in high-inflation scenarios.

---

## Dependency Map

```
startingCapital
  └─ A: → cashToClose (down + repairs + closingCosts) → leftoverCapital → portfolioValue[0]
  └─ B: → portfolioValue[0] directly

Each year y (1..years):
  P1 amortization: balance[y] = amortize(balance[y-1], monthlyPI, monthlyR, 12)
  curHomeValue = price * (1 + appRate)^y
  monthlyPMI: balance[y] > 0.8 * curHomeValue ? pmiRate*loan/12 : 0  ← uses CURRENT value
  inHackPhase = y <= hackYears
  inflFactor = (1 + inflationRate)^(y-1)
  curRent = baseRent * (1 + rentGrowth)^(rentGrowthYears)  ← resets at phase transition
  curEffRent = curRent * (1 - maintVacancyPct)
  curNet = PITI(inflated) + PMI + HOA(inflated) - effRent + ownerUtils + phase2Housing
  curSurplus = curTakeHome - curNet - curLiving
  portfolioValue[y] = portfolioValue[y-1] * (1+r) + curSurplus*12*(1+r/2)
  totalWealth[y] = portfolioValue[y] + holdEquity[y] + p2HoldEquity[y]

Phase 2 buy transition (y = hackYears+1):
  Deduct p2Down + p2ClosingCosts + p2EmergencyFund from portfolioValue
  Initialize p2Balance = p2Loan
  Amortize p2 mortgage for 12 months in SAME year as purchase
```

---

## Requirements (Things to Verify in Code)

- R1. `pmt(rate, nper, pv)` returns a **monthly** payment. When `rate = 0`, it returns `pv / nper` — which is an **annual** amount, not monthly. This is a confirmed bug for zero-rate inputs. Validate behavior is acceptable or add guard.
- R2. PMI drop condition is `balance > 0.8 * curHomeValue` where `curHomeValue` uses **current appreciated value**, not original value. Real-world PMI rules typically use original appraised value unless a new appraisal is ordered. Confirm this is a deliberate model simplification and document it.
- R3. Inflation factor `(1 + inflationRate/100)^(y-1)` means year 1 has zero inflation applied. Confirm this is correct baseline behavior across all inflated quantities (taxes, insurance, HOA, utilities, living costs).
- R4. Rent growth resets at phase transition: `rentGrowthYears = inHackPhase ? (y-1) : (y - hackYears - 1)`. Full rent starts flat at `fullRent` in year `hackYears+1`. Confirm this is intended (i.e., `fullRent` is already the expected year-`hackYears+1` market rent).
- R5. Phase 2 buy: in year `hackYears+1`, the P2 purchase is deducted from portfolio AND 12 months of P2 amortization run in the same year loop iteration. Confirm this models "buy at start of year, pay 12 months" correctly.
- R6. Phase 2 inflation factor at transition year: `p2YearsOut = y - hackYears - 1 = 0` in first Phase 2 year → factor = 1.0. Utilities and renter insurance start at their nominal values. This is correct but confirm the intent for `phase2Utils` (is it expressed in nominal dollars at move-out year?).
- R7. `maintVacancyPct` is applied identically in both Phase 1 (owner-occupied, partial rent) and Phase 2 (full rental). Confirm this is intentional — vacancy assumptions differ when a unit is owner-occupied.
- R8. Emergency fund is deducted from `startingCapital` and never returned or compounded. Confirm this is intentional.
- R9. `calcNeverBuy` in the UI (`App.jsx`) omits `netEquityLiq` from its return object, while the CLI engine includes it as 0. Since Option B has no equity, this doesn't affect calculations, but it is a divergence between the two codebases.
- R10. Option B's renter's insurance (`renterIns`) is excluded from `housingPctGross` calculation (`(monthlyRent + renterUtils) / monthlyIncome * 100`). Confirm this exclusion is intentional.

---

## Invariants (Property-Style Checks)

These should always hold regardless of inputs:

| # | Invariant |
|---|-----------|
| I1 | `totalWealth >= 0` for both options at any year if not underfunded |
| I2 | `balance >= 0` at all times (clamped) |
| I3 | `p2Balance >= 0` at all times (clamped) |
| I4 | `balance` is monotonically decreasing over time (never increases) |
| I5 | At year 0: A's `totalWealth = portfolioValue + down` (hold equity = down payment) |
| I6 | At year 0: B's `totalWealth = startingCapital` |
| I7 | `homeValue` at year `n` = `price * (1 + appRate)^n` (exact, no rounding mid-loop) |
| I8 | `principalPaid + balance = loan` at final year |
| I9 | `totalWealthLiq <= totalWealth` (liquidation is always ≤ hold, due to selling costs ≥ 0) |
| I10 | With `appRate = 0`, `homeValue = price` at all years |
| I11 | With `inflationRate = 0`, `inflFactor = 1.0` at all years |
| I12 | With `downPct >= 20`, `monthlyPMI = 0` at all years |
| I13 | CLI and UI produce identical `totalWealth` for identical inputs (within rounding from the UI's `Math.round` on intermediate values) |
| I14 | S&P breakeven ≥ `investRet` when A wins (it takes a higher return than baseline for B to match A) |
| I15 | When `hackYears >= years`, Phase 2 housing costs are never applied |

---

## Prioritized Edge-Case Checklist

### P0 — Likely to cause wrong answers

1. **`pmt()` with `rate = 0`**: Returns `pv/nper` (annual, not monthly). Any zero-rate scenario produces a mortgage payment 12× too high, inflating costs for A.
2. **`leftoverCapital < 0` (underfunded)**: Portfolio starts at 0 for A but `startingCapital` for B. If the UI continues to display results without a visible warning, users may not notice the invalid state.
3. **Phase 2 buy when `hackYears = 0`**: Phase 2 triggers at `y = 1` while `inHackPhase` is never true. Verify full rental income is collected from year 1, personal housing costs apply from year 1, and P2 setup deducts from portfolio at year 1.
4. **Phase 2 buy when `years <= hackYears`**: Phase 2 never triggers. Confirm `p2FinalNetEquityHold = 0` and is not added to totalWealth.
5. **Negative `portfolioValue` after Phase 2 purchase**: If `p2Underfunded`, `portfolioValue` goes negative. The model continues with a negative portfolio — this means the investor is effectively borrowing. Confirm this behavior is acceptable or capped.

### P1 — Model assumption risks

6. **PMI drop on appreciated value (R2)**: If appreciation is high (e.g. 5%/year), PMI could drop after 2-3 years instead of the ~9 years it would take at 3% down via standard amortization on original value. This can significantly favor A.
7. **Rent growth reset at transition (R4)**: If `fullRent` is set to the same value as `rent` but with the expectation that growth continues from the hack-phase level, the reset may understate rental income in Phase 2.
8. **Income growth hardcoded at 3% vs `inflationRate`**: With `inflationRate = 8%`, real income declines. The model doesn't reflect this.

### P2 — Display/UX inconsistencies

9. **`netEquityLiq` missing from UI `calcNeverBuy`** (R9): Minor, but diverges from CLI engine.
10. **Renter's insurance excluded from `housingPctGross`** for B (R10).
11. **Emergency fund shown as locked up**: The UI should make clear this money never compounds and is not included in `totalWealth`.

### P3 — Numerical / precision

12. **Rounding of `monthlyTax` and `monthlyIns` at day 1**: Both are `Math.round()`. Inflation is then applied to these rounded values, not the exact values. Error accumulates over long horizons.
13. **Mid-year compounding approximation**: For large negative surpluses (e.g. >$5k/month negative cash flow), the `(1 + r/2)` factor on a negative number slightly overstates the portfolio drain.
14. **`balance` clamped at 0**: If overpayment is modeled (shouldn't be possible with standard amortization), balance clamp prevents negative balances. This is defensive and correct.

---

## Test Matrix

### Engine-Level Tests (CLI / `scripts/engine.cjs`)

| Test | Description | How to Validate |
|------|-------------|-----------------|
| T1 | Zero appreciation, zero inflation, zero investment return | Both options should produce deterministic, hand-calculable results |
| T2 | `downPct = 20`, `pmiRate = 1` | `monthlyPMI = 0` throughout entire loan |
| T3 | `downPct = 3`, `appRate = 10` | PMI should drop early (within 2-3 years) due to rapid appreciation |
| T4 | `downPct = 3`, `appRate = 0` | PMI drops only via amortization; should persist ~15-20 years |
| T5 | `hackYears = 0` | No hack phase; Phase 2 starts at y=1; no partial rent collected |
| T6 | `hackYears >= years` | Phase 2 never triggers; p2 equity = 0; p2 buy never deducted |
| T7 | `rate = 0` | Exposes `pmt()` bug; monthly payment should be verified manually |
| T8 | `startingCapital < cashToClose + emergencyFund` | A underfunded; portfolio starts at 0; warning flag set |
| T9 | `phase2Mode = 'buy'` and `portfolioValue < p2TotalCash` | P2 underfunded; portfolio goes negative; warning flag set |
| T10 | `years = 1` | Minimal simulation; verify year-0 and year-1 consistency |
| T11 | `phase2Mode = 'rent'` vs `phase2Mode = 'buy'` | With same total costs, verify both paths produce consistent totalWealth |
| T12 | `inflationRate = 0` | All inflFactor = 1.0; verify no divergence from baseline values |
| T13 | High appreciation (10%) | PMI drops fast; verify `monthlyPMI` transitions correctly year-by-year |
| T14 | `curSurplus` deeply negative | Portfolio can go negative; verify `totalWealth` decreases monotonically |
| T15 | CLI vs UI parity | Run both with same params; compare `totalWealth`, `portfolioValue`, `balance`, `netEquity` |

### UI-Level Checks

| Check | Description |
|-------|-------------|
| U1 | Underfunded warning visible when A's `leftoverCapital < 0` |
| U2 | Phase 2 underfunded warning visible when `p2Underfunded = true` |
| U3 | Winner highlighting correctly reflects `totalWealth` (hold equity), not `totalWealthLiq` |
| U4 | `totalWealthLiq <= totalWealth` always displayed correctly in comparison table |
| U5 | S&P breakeven only shown / only computed when A wins |
| U6 | Year-by-year chart uses same `yearlyData.totalWealth` as final comparison metric |
| U7 | `phase2Mode = 'buy'` shows correct extra rows (P2 equity, P2 cash to close) |
| U8 | `tenantPaysUtils = true` zeroes out `ownerUtils` in Phase 2 |

---

## Assumptions to Confirm in Code

| # | Assumption | Confirmed? |
|---|-----------|------------|
| A1 | PMI based on current appreciated value (not original) | See engine.cjs:116 — confirmed |
| A2 | PMI calculated on original loan amount | See engine.cjs:116 `(pmiRate/100) * loan / 12` — confirmed |
| A3 | `emergencyFund` never compounds or returns to portfolio | See code: deducted from leftoverCapital, not re-added — confirmed |
| A4 | Phase 2 closing costs use Property 1's `buyClosingCostPct` | See engine.cjs:121 — confirmed |
| A5 | `fullRent` growth resets to 0 at transition year | See engine.cjs:102-103 — confirmed |
| A6 | `maintVacancyPct` same in both hack and full-rental phases | See engine.cjs:104 — confirmed |
| A7 | Income grows at exactly 3%/year regardless of `inflationRate` | See engine.cjs:106 — confirmed |
| A8 | Mortgage PI is nominal-fixed (not indexed to inflation) | See curPITI formula — PI unchanged, T/I inflate — confirmed |
| A9 | Phase 2 buy amortizes 12 months in purchase year | See engine.cjs:134-138 — confirmed |
| A10 | Phase 2 personal renter's insurance = 0 in buy mode | See engine.cjs:145 `curPersonalRenterIns = 0` — confirmed |

---

## CLI/UI Consistency Protocol

1. Run `node scripts/compare.cjs` with default params; capture all output fields.
2. Open the UI at the same default param values; read matching fields from the UI table.
3. Compare: `totalWealth`, `totalWealthLiq`, `portfolioValue`, `balance`, `netEquity`, `netEquityLiq`, `homeValue`, `surplus`, `cashToClose`, `leftoverCapital`.
4. **Acceptable divergences**: UI uses `Math.round()` on some intermediate values (e.g. `monthlyTax`, `monthlyIns`) before feeding into the loop; CLI does the same. Final values may differ by ±$1 due to rounding of intermediate `Math.round()` calls.
5. **Not acceptable**: Any divergence > $1 on final `totalWealth` for the same inputs indicates formula divergence between the two engines.

---

## Success Criteria

- All invariants (I1–I15) pass for default inputs and the 15 engine-level test scenarios.
- All confirmed bugs (especially R1 / pmt zero-rate) are documented or fixed before the model is used for decision-making.
- All model assumptions (A1–A10, especially PMI drop on appreciated value) are documented in the UI or in `equations.md`.
- CLI and UI produce identical results within ±$1 for all test inputs.

---

## Scope Boundaries

- This spec covers correctness of the engine logic, not UI layout or visual design.
- Tax treatment (capital gains, depreciation, mortgage interest deduction) is explicitly out of scope — the model is pre-tax by design.
- Inflation compounding on renter's insurance in Phase 2 rent mode is in scope (R6).

---

## Outstanding Questions

### Resolve Before Planning
_None — this is a review spec, not a feature plan._

### Deferred to Planning / Review
- [Affects R2][Model decision] Should PMI drop use original appraised value or current market value? Changing to original value would require storing `originalHomeValue` and using it in the PMI condition — a small code change with significant model impact.
- [Affects R1][Fix needed] Should `pmt()` return 0 or throw when `rate = 0`, instead of the current annual-amount bug?
- [Affects R9][Minor] Should `netEquityLiq: 0` be added to UI `calcNeverBuy` return for parity with CLI?

## Next Steps

→ Proceed to code review using this spec as the audit checklist.
