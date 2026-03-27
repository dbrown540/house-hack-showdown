---
title: Modeling Depreciation Tax Benefits in the House-Hack Financial Comparison
date: 2026-03-27
category: docs/solutions/best-practices
module: financial-model
problem_type: best_practice
component: tooling
symptoms:
  - Pre-tax model systematically understated Option A wealth in high-bracket scenarios
  - No mechanism to capture rental property depreciation deductions
  - Comparison felt unfair to users who knew about depreciation tax sheltering
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - depreciation
  - tax-modeling
  - financial-model
  - calcbuy
  - slider
  - cli-ui-parity
  - compounding
related_components:
  - frontend_stimulus
  - documentation
---

# Modeling Depreciation Tax Benefits in the House-Hack Financial Comparison

## Problem

The house-hack financial model was pre-tax: it compared Option A (buy + rent rooms) vs. Option B (rent + invest in S&P 500) without accounting for rental property depreciation deductions. This systematically understated Option A's realistic wealth outcome for users in higher tax brackets, since depreciation (~1/27.5 of building value annually) can shelter rental income with no equivalent benefit available in Option B.

## Symptoms

- Users in the 24–32% tax bracket had no way to model their actual after-tax cash flows
- The comparison was incomplete for anyone who knew to claim depreciation deductions
- No line item in the results table made the tax effect visible and separable from base cash flows

## What Didn't Work

Several approaches were considered and rejected before the final design:

- **Separate building-ratio + tax-bracket inputs**: Two sliders added calibration burden and exposed internal variables without improving user clarity. Rejected in favor of a single composite percentage.
- **Positional function parameter**: We chose not to pass `taxBenefitPct` as an explicit arg in this version, to stay aligned with the existing closure-based assumptions pattern in `App.jsx`. A future refactor could make it explicit for consistency with the CLI engine.
- **Phase 2 depreciation**: Modeling depreciation on the second rental property in Phase 2 was deferred — it doubled the surface area without meaningfully changing the comparison for typical scenarios.
- **Depreciation recapture on sale**: Excluded because the model uses hold equity (not liquidation) as the primary metric, so recapture is never triggered in the main comparison.
- **Return multiplier approach**: Considered applying the tax benefit as a multiplier to `investRet`, but this would distort the investment return assumption. The correct framing is "extra annual cash from tax savings," not "improved market returns."

## Solution

The depreciation tax benefit is modeled as a **fixed annual cash inflow** added to Option A's portfolio compounding. The slider (0–1.5% of property value per year, default 0%) encodes both building ratio and marginal tax rate into a single composite input.

### Formula

```
annualTaxBenefit = price * (taxBenefitPct / 100)
```

Calculated once before the year loop since the depreciation basis is fixed at purchase (it does not grow with appreciation).

### Integration into the year loop (`src/App.jsx` ~line 197, `scripts/engine.cjs` ~line 168)

```javascript
// BEFORE
portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2);

// AFTER
portfolioValue = portfolioValue * (1 + r) + (curSurplus * 12 + annualTaxBenefit) * (1 + r / 2);
```

The `(1 + r / 2)` mid-year compounding factor applies to both `curSurplus * 12` and `annualTaxBenefit`, consistent with the model's convention that new contributions earn half a year's return on average.

### State and closure (`src/App.jsx`)

```javascript
const [taxBenefitPctA, setTaxBenefitPctA] = useState(0);

// Inside calcBuy closure (before year loop):
const annualTaxBenefit = price * taxBenefitPctA / 100;
```

### Return object (both `src/App.jsx` and `scripts/engine.cjs`)

```javascript
annualTaxBenefit: Math.round(annualTaxBenefit),
```

### Slider UI (`src/App.jsx`)

```jsx
<Slider
  label="Tax Benefit (Depreciation)"
  value={taxBenefitPctA}
  onChange={setTaxBenefitPctA}
  min={0}
  max={1.5}
  step={0.1}
  prefix=""
  suffix="% of property value per year (tax savings)"
  color={COLORS.A}
  tooltip="Rental properties can deduct annual depreciation (~1/27.5 of the building value) from
    taxable income. This slider adds the equivalent annual savings to Option A's cash flow.
    0% = no tax effect (default). 0.5% ≈ typical landlord in the 22–24% tax bracket.
    1.0% ≈ higher bracket or high building-value ratio. Applied to all years as a simplification.
    Does NOT model: mortgage interest deduction, passive loss rules, depreciation recapture, or
    state taxes."
/>
```

### Comparison table row (conditional display)

```jsx
{a.annualTaxBenefit > 0 && (
  <Row3
    label="Tax Savings (Depreciation) / yr"
    vals={[a.annualTaxBenefit, 0]}
    winIdx={wHigh(a.annualTaxBenefit, 0)}
  />
)}
```

Only renders when taxBenefitPct > 0, keeping the table clean for users not using this feature.

### useMemo dependency

```javascript
const a = useMemo(() => calcBuy(pA, rA, fullRentA, repA, appA, rgA),
  [pA, rA, fullRentA, repA, appA, rgA, taxBenefitPctA, ...otherDeps]);
```

### CLI defensive guard (`scripts/engine.cjs`)

```javascript
const pct = Math.max(0, taxBenefitPct || 0);
const annualTaxBenefit = price * pct / 100;
```

Clamps negative values and treats undefined as 0 for backward compatibility with direct API callers.

### Calibration reference

| Building ratio | Annual deduction (on $300K) | @ 22% bracket | @ 24% bracket | @ 32% bracket |
|---|---|---|---|---|
| 60% ($180K) | $6,545 | 0.48% | 0.52% | 0.70% |
| 75% ($225K) | $8,182 | 0.60% | 0.65% | 0.87% |
| 85% ($255K) | $9,273 | 0.68% | 0.74% | 0.99% |

**Rule of thumb**: 0.5% ≈ typical scenario; 1.0% ≈ high bracket or high building-value ratio.

## Why This Works

1. **Depreciation basis is fixed at purchase**: Computing `annualTaxBenefit` once before the loop (not per year) is financially correct — the deduction is based on original purchase price, not current value.

2. **Mid-year compounding convention**: Treating the tax benefit the same way as surplus cash flow (`(1 + r / 2)` factor) maintains internal consistency across all cash flow types.

3. **Single composite slider**: Encodes building ratio and tax bracket into one user-controlled value, reducing calibration burden while still being grounded in real tax math. The tooltip and calibration table give users the anchors to set it correctly.

4. **Zero default preserves pre-tax baseline**: Existing users see no change. New users opt in consciously. This makes the model honest about what's included.

5. **Additive, not multiplicative**: Adding tax benefit as cash flow (not as a modifier to `investRet`) keeps the investment return assumption clean and the tax contribution separately attributable.

## Prevention

### CLI/UI sync (highest risk)

Any change to the depreciation logic in `src/App.jsx` must be immediately mirrored in `scripts/engine.cjs`. These files are manually synced — there is no import link. Add a checklist item in code review:

> "If `calcBuy` depreciation logic changed in App.jsx, is the same change in engine.cjs?"

### useMemo deps (second-highest risk)

If `taxBenefitPctA` is removed from the useMemo deps array, the UI silently serves stale calculations when the slider moves. Code review should explicitly verify the deps array:

```javascript
// Verify taxBenefitPctA appears here:
const a = useMemo(() => calcBuy(...), [..., taxBenefitPctA, ...]);
```

### Test invariants to verify after any changes

Run `node scripts/tests.cjs` and confirm Section 9 passes:

- `taxBenefitPct = 0` → `annualTaxBenefit = 0`, output identical to pre-tax baseline
- `taxBenefitPct > 0` → Option A `totalWealth` increases; Option B `totalWealth` unchanged
- `calcNeverBuy` always returns `annualTaxBenefit: 0` regardless of input
- Negative `taxBenefitPct` is clamped to 0 (CLI guard)

Test at boundaries: 0, 0.5, 1.0, 1.5. Test with projection lengths 1, 10, 40 years.

### Known limitations (document in tooltip and changelog)

- **Hack-phase proration not applied**: The full annual benefit is applied even during the house-hack phase when the owner occupies one unit. Actual depreciation would be prorated by the non-owner-occupied fraction. The overstatement is usually modest for typical settings and short hack phases, but can grow for larger properties, higher slider values, or longer owner-occupancy periods.
- **27-year expiration not modeled**: Depreciation expires after 27.5 years. For projections > 27 years, the model overstates the benefit. If projections are extended, add logic to stop applying after year 27.
- **No passive loss limitations**: High-income taxpayers ($150K+ MAGI) may face passive activity loss limits. Document this as a caveat for users in that range.
- **Federal only**: State tax rates are not modeled. Users in high-tax states (CA, NY) may want to set the slider slightly higher to approximate combined federal + state benefit.

### When to revisit the design

- If the model adds explicit tax bracket and building ratio inputs, derive `taxBenefitPct` automatically rather than requiring slider calibration.
- If projections commonly exceed 27 years, add a year-27 cutoff for the benefit.
- If Phase 2 depreciation is added, mirror the same mid-year compounding logic and update both UI and CLI in sync.

## Related Issues

- [Implementation plan](../../plans/2026-03-27-002-feat-depreciation-tax-benefit-slider-plan.md)
- [Requirements and calibration reference](../../brainstorms/2026-03-27-depreciation-tax-benefit-requirements.md)
- [Math correctness foundation](../../plans/2026-03-27-001-fix-math-correctness-engine-plan.md) — the test infrastructure and CLI/UI parity contract that this feature builds on
