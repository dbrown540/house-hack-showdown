---
date: 2026-03-27
topic: depreciation-tax-benefit
---

# Depreciation Tax Benefit Slider

## Problem Frame

The model is currently pre-tax. This understates Option A's advantage in realistic scenarios because rental real estate generates a unique, non-cash tax deduction (depreciation) that shelters rental income and can improve after-tax cash flow significantly. Option B (S&P investing) has no equivalent. Without capturing this effect, the model systematically understates Option A's realistic wealth outcome.

The goal is to add a single slider that approximates this benefit in a way that is honest, explainable, and resistant to overfit — without building a tax engine.

## Requirements

- R1. A new slider, **"Tax Benefit (Depreciation)"**, is added to Option A's inputs. It represents the estimated annual tax savings from depreciation as a percentage of the property purchase price.
- R2. The slider range is **0% to 1.5%** in 0.1% increments. Default is **0%** (opt-in; current pre-tax model behavior is preserved unless the user explicitly sets a value).
- R3. The adjustment is applied as additional annual cash flow to Option A only:
  - `annualTaxBenefit = price * taxBenefitPct / 100`
  - Added to `curSurplus` each year (as `annualTaxBenefit / 12` monthly equivalent) **after** `curSurplus` is fully computed from its components (`curSurplus = curTakeHome - curNet - curLiving`), and **before** the portfolio compounding step. Must not be mixed into rent/expense calculations so it remains separable for display and debugging.
  - Applied for all years in the projection.
  - Applied only to Property 1 (not Phase 2 buy property).
- R4. The slider must be included in both `src/App.jsx` (UI) and `scripts/engine.cjs` (CLI), kept in sync per project conventions.
- R5. The annual tax benefit must be surfaced as a visible line item in the comparison table (Option A shows the value, Option B shows $0), so the contribution is transparent and not hidden inside wealth totals.
- R6. The tooltip for the slider must communicate:
  - What is being modeled (depreciation deduction, ~1/27.5 of building value per year)
  - What is **not** modeled (mortgage interest, passive loss rules, state taxes, depreciation recapture on sale)
  - The calibration range guidance (0.5% ≈ typical; 1.0% ≈ high bracket or high building value)

## Success Criteria

- Setting the slider to 0% produces output identical to the current pre-tax model.
- The adjustment compounds through the portfolio correctly (flows through `curSurplus` → `portfolioValue`).
- No distortion of Option B's results.
- The line-item display makes it clear how much of Option A's wealth advantage comes from the tax benefit vs. base cash flows.
- Calibration range (0.5%–1.0%) is grounded in the depreciation math, visible in the tooltip or help text.

## Scope Boundaries

- No full tax engine: no brackets, no filing status, no passive loss rules, no state/federal split.
- No Phase 2 buy property depreciation.
- No mortgage interest deduction modeling.
- No depreciation recapture cost on sale (the model uses hold equity as the primary metric; recapture is only triggered at sale).
- No building ratio input: the user sets the effective percentage directly. Building ratio sensitivity is a potential v2 upgrade, not part of this feature.
- The adjustment does not stop at year 27 in this version (depreciation technically expires after 27.5 years). For projections ≤ 27 years, this is correct. For longer projections, the benefit is slightly overstated — document as a known limitation.

## Key Decisions

- **Cash flow, not return multiplier**: Adding to `curSurplus` is correct because it compounds naturally through the portfolio, avoids interaction with `investRet`, and is conceptually honest ("extra annual cash from tax savings").
- **0% default (opt-in)**: Preserves existing behavior for users who have calibrated expectations against the current pre-tax model. More honest framing: users choose to activate it rather than opting out.
- **Property 1 only**: Adding Phase 2 depreciation would double the surface area without meaningful insight; deferred.
- **1.5% cap**: Prevents unrealistic scenarios. At $300K with 10% investment return, 1.5% adds ~$72K over 10 years — meaningful but not dominant.
- **Label: "Tax Benefit (Depreciation)"**: More accurate than "Real Estate Tax Advantage," which implies broader tax modeling.

## Design Note: Slider as Proxy for Hidden Variables

The slider implicitly encodes two user-specific unknowns — **building ratio** (60–85% is typical) and **marginal tax rate** (22–32% is typical) — into a single percentage. This is intentional and elegant: users who know their situation can dial in a precise value; users who don't can use the guidance anchors (0.5% = typical, 1.0% = high bracket/high building value). The tooltip must make these anchors legible so the proxy is trustworthy rather than opaque. A future v2 could expose building ratio as a separate input and derive the effective percentage automatically.

## Calibration Reference

For planners and reviewers — how the 0.5%–1.0% range is derived:

| Building ratio | Annual deduction (on $300K) | Tax savings @ 22% | Tax savings @ 24% | Tax savings @ 32% |
|---|---|---|---|---|
| 60% ($180K) | $6,545 | 0.48% | 0.52% | 0.70% |
| 75% ($225K) | $8,182 | 0.60% | 0.65% | 0.87% |
| 85% ($255K) | $9,273 | 0.68% | 0.74% | 0.99% |

Formula: `buildingValue / 27.5 × marginalRate / price`

## Invariants / Guardrails

- `taxBenefitPct = 0` → output identical to current model (regression test required).
- `taxBenefitPct > 0` → `totalWealth(A)` increases; `totalWealth(B)` is unchanged.
- The benefit is applied before the mid-year compounding step (same timing as `curSurplus`).
- At the maximum value (1.5%) on a $300K property over 10 years at 10% return, the max portfolio impact is ~$72K — reviewers should verify this does not flip results in edge cases where A and B are already very close.

## UX Specification

**Slider label:** Tax Benefit (Depreciation)
**Unit display:** % of property value per year (tax savings)
**Range:** 0.0% – 1.5%, step 0.1%
**Default:** 0.0%
**Placement:** Option A input section, near property-level inputs (after appreciation or rent growth)

**Tooltip text:**
> Rental properties can deduct annual depreciation (~1/27.5 of the building value) from taxable income, sheltering rental income from taxes. This slider adds the equivalent annual savings to Option A's cash flow.
>
> **0% = no tax effect** (current default). **0.5%** ≈ typical landlord in the 22–24% tax bracket. **1.0%** ≈ higher bracket or high building-value ratio.
>
> Does **not** model: mortgage interest deduction, passive loss rules, depreciation recapture on sale, or state taxes. Consult a tax professional for your situation.

**Comparison table row:**
- Label: "Annual Tax Benefit (Depr.)"
- Option A: shows `annualTaxBenefit` in dollars (formatted with `fmt()`)
- Option B: shows $0
- Winner highlighting: Option A always wins this row when `taxBenefitPct > 0`

## Test Cases

| Scenario | Expected behavior |
|---|---|
| `taxBenefitPct = 0` | Identical output to current model |
| Default params + `taxBenefitPct = 0.5%` | A gains ~$1,500/yr cash flow → ~$24K extra compounded portfolio over 10 years at 10% |
| Default params + `taxBenefitPct = 1.5%` | A gains ~$4,500/yr → ~$72K extra; verifiable via CLI |
| B barely wins at default → add 0.5% | May flip winner to A; both display values should be shown for transparency |
| `taxBenefitPct > 0` with `hackYears = years` (never exit hack) | Benefit still applies; no guard needed |
| Phase 2 mode = buy | No change to P2 depreciation; benefit applies only to Property 1 |
| Short projection (years = 1) | Benefit applies for the single year; no special case needed |

## Dependencies / Assumptions

- `annualTaxBenefit` is based on the purchase `price`, not the current appreciated value. Depreciation basis is fixed at purchase.
- The adjustment assumes the user is eligible for the deduction (active participation, income under passive loss thresholds, etc.). The tooltip surfaces this caveat.
- Both `src/App.jsx` and `scripts/engine.cjs` must be updated in sync, per CLAUDE.md conventions.
- `scripts/defaults.json` should set `taxBenefitPct: 0` so CLI behavior matches the pre-tax default.

## Outstanding Questions

### Resolve Before Planning
_(none — all product decisions resolved)_

### Deferred to Planning
- [Affects R3][Technical] Confirm the exact line in the year loop where `curSurplus += annualTaxBenefit / 12` is inserted — it must come after `curSurplus = curTakeHome - curNet - curLiving` and before the `portfolioValue` update. Verify it does not affect the `surplus` display value shown in the comparison table header row (that row should reflect base cash flow, not the tax benefit).
- [Affects R4][Technical] The CLI `calcBuy` takes a flat params object; confirm `taxBenefitPct` plumbs through cleanly without requiring destructuring changes elsewhere.
- [Affects R1, R6][Needs research] Determine exact placement in the UI slider list for best flow: after "Appreciation" or after "Rent Growth" in the Option A section?

## Next Steps

→ `/ce:plan` for structured implementation planning
