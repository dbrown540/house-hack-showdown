---
title: "feat: Depreciation Tax Benefit Slider"
type: feat
status: completed
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-depreciation-tax-benefit-requirements.md
---

# feat: Depreciation Tax Benefit Slider

## Overview

Add a single slider — "Tax Benefit (Depreciation)" — that models the annual tax savings from depreciation as a percentage of property value and adds it to Option A's cash flow each year. The model stays pre-tax at the 0% default; the slider is an opt-in adjustment. See origin document for calibration math.

## Problem Frame

The current model is pre-tax, which understates Option A's realistic wealth outcome in scenarios where the owner claims depreciation. Rental property depreciation (~1/27.5 of building value per year) creates a non-cash deduction that shelters rental income, with no S&P equivalent. The goal is to approximate this effect as a return-equivalent cash flow addition without building a tax engine.

(see origin: docs/brainstorms/2026-03-27-depreciation-tax-benefit-requirements.md)

## Requirements Trace

- R1. New slider "Tax Benefit (Depreciation)" added to Option A inputs, 0%–1.5%, step 0.1%, default 0%.
- R2. Default is 0%: existing pre-tax behavior is fully preserved unless the user sets a value.
- R3. Adjustment applied as annual cash flow to Option A only: `annualTaxBenefit = price * taxBenefitPct / 100`, added to `curSurplus` inside the year loop after surplus components are computed, before portfolio compounding. Applied to Property 1 for all projection years.
- R4. Both `src/App.jsx` and `scripts/engine.cjs` updated in sync.
- R5. Annual tax benefit surfaced as a comparison table row (A shows value, B shows $0).
- R6. Slider tooltip names what is modeled, what is not, and provides calibration anchors.

## Scope Boundaries

- No Phase 2 buy property depreciation.
- No mortgage interest deduction, passive loss rules, or state tax modeling.
- No depreciation recapture cost on sale (model uses hold equity, recapture not triggered).
- No building ratio input; user sets the effective percentage directly.
- Depreciation does not stop at year 27 in this version (known limitation for projections > 27 years; document in tooltip).
- No changes to Option B calculations.

## Context & Research

### Relevant Code and Patterns

- `src/App.jsx:77` — `calcBuy` closure signature: `(price, rent, fullRent, repairs, appRate, rentGrowth)`. Shared state accessed via closure (e.g., `rate`, `years`, `investRet`). `taxBenefitPct` follows the closure pattern — no signature change needed.
- `src/App.jsx:185–188` — Surplus and compounding step:
  ```
  const curSurplus = curTakeHome - (curNet + curLiving);  // line 185
  portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2);  // line 188
  ```
  Insert `annualTaxBenefit` (computed once before the loop) into the compounding line at 188. The `surplus` return value (line 95, pre-loop) is a separate variable and is NOT affected.
- `src/App.jsx:232–254` — `calcBuy` return object. Add `annualTaxBenefit: Math.round(annualTaxBenefit)`.
- `src/App.jsx:286–303` — `calcNeverBuy` return object. Add `annualTaxBenefit: 0`.
- `src/App.jsx:307` — useMemo for `a`: `calcBuy(pA, rA, fullRentA, repA, appA, rgA)` with deps array. Add `taxBenefitA` to the deps array.
- `src/App.jsx:511–512` — Slider placement: after `rgA` (Rent Growth), line 512. New slider goes here.
- `src/App.jsx:811–812` — Row3 placement: after "Total Rent Collected", before "Investment Portfolio". New row goes here.
- `scripts/engine.cjs:38–49` — `calcBuy` params destructuring. Add `taxBenefitPct = 0` with default. Same year-loop and return changes as UI.
- `scripts/defaults.json` — Add `"taxBenefitPct": 0`.
- `scripts/tests.cjs` — Existing test suite, plain Node.js `assert`. Add regression and impact tests.

### Institutional Learnings

- CLAUDE.md: `src/utils/math.js` and `scripts/engine.cjs` are manual copies — both must be updated together. Same principle applies here: any `calcBuy` logic change in App.jsx must be mirrored in engine.cjs.
- Prior art: `netEquityLiq: 0` was added to `calcNeverBuy` in Unit 3 of the math-correctness fix. Same pattern for `annualTaxBenefit: 0`.

### External References

- None required. Math is self-contained; calibration is fully documented in the origin requirements doc.

## Key Technical Decisions

- **Closure access, not positional arg**: `taxBenefitPct` is added as a `useState` value accessed inside the `calcBuy` closure, consistent with how all shared assumptions (e.g., `rate`, `years`) are handled. Positional args are per-property values passed explicitly (e.g., `price`, `appRate`). The tax benefit is logically a per-property input but adding it as a positional arg would require changing the function signature and useMemo call — unnecessary complexity for a single new param.
- **Compute once before loop**: `annualTaxBenefit = price * taxBenefitPct / 100` is computed once before the year loop. `price` and `taxBenefitPct` are both constant over the projection; no need to recompute per iteration.
- **Compounding line change, not surplus variable change**: The insertion point is the compounding formula itself — `(curSurplus * 12 + annualTaxBenefit) * (1 + r / 2)` — rather than mutating `curSurplus`. This keeps `curSurplus` as a clean expression of base cash flow (useful for debugging) and ensures the `surplus` return value (computed pre-loop from year-1 components) is unaffected.
- **`taxBenefitPct = 0` default in CLI destructuring**: Backward-compatible for any callers that pass a params object without the new field.

## Open Questions

### Resolved During Planning

- **Does adding to the year loop affect the `surplus` display row?** No. `surplus` (returned at line 95) is computed once from year-1 components before the loop. `curSurplus` inside the loop is a separate local variable. No interaction.
- **Does the CLI need a signature change?** No. `calcBuy` in engine.cjs uses a flat params object; `taxBenefitPct = 0` destructuring default is sufficient and backward-compatible.
- **Slider placement?** After "Rent Growth" (rgA) in the Option A input section, line 512. Follows the per-property inputs naturally.

### Deferred to Implementation

- **Exact deps array token**: Confirm `taxBenefitPctA` is added to the `a = useMemo(...)` deps array without accidentally omitting it. A missing dep would cause stale calculation silently.
- **Row3 `winIdx` for always-A-wins row**: When `taxBenefitPct > 0`, A always wins this row. When `taxBenefitPct = 0`, both are $0 (tie). Implementer should use `wHigh(a.annualTaxBenefit, 0)` which returns 0 (A) when A's value > 0, null on tie — consistent with how other always-A rows handle it.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
State layer (App.jsx):
  taxBenefitPctA: useState(0)            // new, Option A only (name signals: % not $, scoped to A)

calcBuy closure body (App.jsx + engine.cjs mirror):
  // Before year loop:
  const annualTaxBenefit = price * taxBenefitPct / 100;

  // Inside year loop, replace:
  portfolioValue = pv * (1 + r) + curSurplus * 12 * (1 + r / 2)
  // With:
  portfolioValue = pv * (1 + r) + (curSurplus * 12 + annualTaxBenefit) * (1 + r / 2)

  // Return object additions:
  annualTaxBenefit: Math.round(annualTaxBenefit)

calcNeverBuy return addition (App.jsx):
  annualTaxBenefit: 0

UI layer (App.jsx):
  useMemo deps for `a`: add taxBenefitA
  <Slider> after rgA slider
  <Row3> after totalRentCollected row
```

## Implementation Units

- [ ] **Unit 1: Engine — add taxBenefitPct to calcBuy in both files**

**Goal:** Wire `taxBenefitPct` into the year loop and return object for both the UI engine (App.jsx) and CLI engine (engine.cjs), keeping them in sync.

**Requirements:** R3, R4

**Dependencies:** None

**Files:**
- Modify: `src/App.jsx` (calcBuy closure body only: pre-loop constant, compounding line, return object; also `calcNeverBuy` return object)
- Modify: `scripts/engine.cjs` (same changes: params destructuring, pre-loop constant, compounding line, return object)

**Approach:**
- In App.jsx's `calcBuy` closure: compute `annualTaxBenefit` once before the year loop using `price` and `taxBenefitPct` (from closure scope). Modify the portfolio compounding line to `(curSurplus * 12 + annualTaxBenefit) * (1 + r / 2)`. Add `annualTaxBenefit: Math.round(annualTaxBenefit)` to the return object.
- In App.jsx's `calcNeverBuy`: add `annualTaxBenefit: 0` to the return object.
- In engine.cjs: add `taxBenefitPct = 0` to params destructuring (with default). Apply identical year-loop and return changes. The `taxBenefitPct` param is already available since it flows through from compare() which passes the full params object. Additionally, guard against bad CLI inputs by computing `const pct = Math.max(0, taxBenefitPct || 0)` before `annualTaxBenefit = price * pct / 100`. This prevents NaN propagation or negative values from direct API callers bypassing the slider bounds.
- Do not modify the `surplus` return value or any pre-loop calculations.

**Patterns to follow:**
- `src/App.jsx:185–188` — existing surplus/compounding pattern
- `scripts/engine.cjs:160–163` — matching CLI surplus/compounding pattern
- `src/App.jsx:296` — `netEquityLiq: 0` in calcNeverBuy (same pattern for annualTaxBenefit: 0)

**Test scenarios:**
- Happy path: `taxBenefitPct = 0` on default params → `annualTaxBenefit = 0`, `totalWealth` and `portfolioValue` identical to pre-change output
- Happy path: `taxBenefitPct = 0.5` on `price = 300000` → `annualTaxBenefit = 1500`, portfolio compounds correctly; after 10 years at 10% return, extra portfolio contribution is ~$24K (verify via CLI)
- Edge case: `taxBenefitPct = 1.5` (max) on `price = 300000` → `annualTaxBenefit = 4500`; `totalWealth(A)` increases, `totalWealth(B)` unchanged
- Edge case: `taxBenefitPct > 0` with `hackYears = years` (no Phase 2 ever) → benefit still applies; no guard needed
- Invariant: `calcNeverBuy` returns `annualTaxBenefit === 0` regardless of `taxBenefitPct` value passed to calcBuy

**Verification:**
- `node scripts/tests.cjs` passes with `taxBenefitPct = 0` (no regression)
- CLI `node scripts/compare.cjs` with `taxBenefitPct = 0.5` shows `houseHack.annualTaxBenefit = 1500` and `totalWealth` ~$24K higher than default run (rough check)
- `neverBuy.annualTaxBenefit` is absent or 0 in CLI output

---

- [ ] **Unit 2: UI — state, slider, and useMemo deps**

**Goal:** Expose `taxBenefitPct` to the user via a slider and wire the new state into the calcBuy useMemo call.

**Requirements:** R1, R2, R6

**Dependencies:** Unit 1 (the closure variable must exist before wiring the state)

**Files:**
- Modify: `src/App.jsx` (useState declaration, useMemo deps array for `a`, Slider component in Option A section)

**Approach:**
- Add `const [taxBenefitPctA, setTaxBenefitPctA] = useState(0)` in the Option A state block (after `rgA`). The `A` suffix makes it unambiguous that this is the Option A state and that the value is a percentage, not a dollar amount.
- The calcBuy closure reads `taxBenefitPctA` and uses it as `taxBenefitPct` — no signature change needed.
- Add `taxBenefitPctA` to the `a = useMemo(...)` deps array alongside `appA`, `rgA`, etc.
- Add a `<Slider>` after the "Rent Growth" slider (line 512), using the exact label, range, step, and tooltip from the UX spec. The tooltip must include: "based on original purchase price, not current value" — this avoids a common misunderstanding where users assume depreciation grows with appreciation.

**Patterns to follow:**
- `src/App.jsx:47–48` — `appA` / `rgA` state declarations (same structure; naming convention: `<concept><PropertyLetter>`)
- `src/App.jsx:511–512` — Slider usage for `appA` and `rgA` (same props pattern: label, value, onChange, min, max, step, prefix, suffix, color)
- `src/App.jsx:307` — existing useMemo deps array for `a`

**Test scenarios:**
- Happy path: slider renders at 0% default; moving it to 0.5% updates Option A wealth in the UI
- Happy path: slider min = 0, max = 1.5, step = 0.1; confirm via visual inspection that increments are 0.1
- Edge case: setting slider back to 0% restores pre-tax output (identical to B-unchanged scenario)
- Regression: `taxBenefitA` is in the useMemo deps array; changing the slider triggers recalculation (confirm via UI re-render)

**Verification:**
- Slider appears in the Option A section after "Rent Growth"
- Tooltip is present and contains the required text about what is/is not modeled
- Changing the slider value changes Option A's totalWealth; Option B totalWealth is unchanged
- `useMemo` deps array includes `taxBenefitA`

---

- [ ] **Unit 3: UI — comparison table row**

**Goal:** Surface `annualTaxBenefit` as a visible line item in the comparison table so users can see the contribution clearly.

**Requirements:** R5

**Dependencies:** Unit 1 (return object must include `annualTaxBenefit`), Unit 2 (state must exist)

**Files:**
- Modify: `src/App.jsx` (comparison table section, near line 811)

**Approach:**
- Add a `<Row3>` after the "Total Rent Collected" row (line 811) and before the "Investment Portfolio" row.
- Label: "Tax Savings (Depreciation)"
- `vals`: `[a.annualTaxBenefit, 0]`
- `winIdx`: `wHigh(a.annualTaxBenefit, 0)` — returns 0 (A wins) when A > 0, null on tie (both $0 at default)
- Use `fmt()` for display (consistent with all other dollar rows)
- No `highlight` prop (this is a secondary informational row, not a headline metric)

**Patterns to follow:**
- `src/App.jsx:811` — `<Row3 label="Total Rent Collected" vals={[a.totalRentCollected, null]} />` — same structure, single-option row
- `src/App.jsx:813` — `<Row3 label="Investment Portfolio" ... highlight />` — shows the `highlight` prop is reserved for headline metrics

**Test scenarios:**
- Happy path: `taxBenefitPct = 0` → row shows "$0" for both options (or "—" if null; implementer should use 0 explicitly to match `fmt(0) = "$0"`)
- Happy path: `taxBenefitPct = 0.5`, `price = 300000` → row shows "$1,500" for A, "$0" for B
- Happy path: A column highlights when `taxBenefitPct > 0`; no highlight at 0% (tied)

**Verification:**
- Row appears between "Total Rent Collected" and "Investment Portfolio"
- A column shows `fmt(a.annualTaxBenefit)` and highlights correctly
- B column shows "$0" always

---

- [ ] **Unit 4: Tests and defaults**

**Goal:** Add regression tests to lock in the zero-default invariant and the expected numeric impact at 0.5%, and update defaults.json for CLI baseline consistency.

**Requirements:** R2 (zero default preserved), R3 (compounding correctness)

**Dependencies:** Units 1–3

**Files:**
- Modify: `scripts/tests.cjs`
- Modify: `scripts/defaults.json`

**Approach:**
- In `defaults.json`: add `"taxBenefitPct": 0`.
- In `tests.cjs`, add a new test group "9. Depreciation tax benefit" with:
  - Zero-default regression: `taxBenefitPct = 0` → `annualTaxBenefit = 0`, `totalWealth` matches the existing default-params baseline.
  - Impact test: `taxBenefitPct = 0.5`, `price = 300000` → `annualTaxBenefit = 1500`. Compute expected portfolio uplift independently (sum of $1,500/yr compounded at 10% mid-year for 10 years ≈ $23,900–$24,100) and assert within ±$100 tolerance (due to mid-year compounding assumption; if compounding timing changes in the future, tolerance and expected value must be recalibrated).
  - Isolation test: `taxBenefitPct = 0.5` → `neverBuy.totalWealth` and `neverBuy.annualTaxBenefit` are unchanged from default.
  - Max-value sanity: `taxBenefitPct = 1.5`, `price = 300000` → `annualTaxBenefit = 4500`; `totalWealth(A)` increases by ~$72K vs base (±$500 tolerance for compounding).

**Patterns to follow:**
- `scripts/tests.cjs` — existing `test()` helper, section header comments, `assert.strictEqual` / `assert.ok` pattern

**Test scenarios:**
- Same as the test scenarios described in Approach above — these are the tests being written, not tests of the test suite itself

**Verification:**
- `node scripts/tests.cjs` exits with code 0, all tests pass including new group
- New test group labeled "9. Depreciation tax benefit" appears in output
- `node scripts/compare.cjs` with no extra params uses `taxBenefitPct: 0` from defaults (unchanged output vs. current baseline)

## System-Wide Impact

- **Interaction graph:** `calcBuy` is called once via `useMemo` for Option A. The change is localized to the year loop inside `calcBuy` and the return object. `calcNeverBuy` is unaffected except for the `annualTaxBenefit: 0` addition. No callbacks, observers, or middleware involved.
- **Error propagation:** If `taxBenefitPct` is undefined (e.g., old CLI callers not passing the field), the `= 0` destructuring default ensures `annualTaxBenefit = 0` and no behavior change.
- **State lifecycle risks:** None — all values are recomputed from React state on every render via `useMemo`. No caching or persistence.
- **API surface parity:** `scripts/engine.cjs` must mirror the exact same year-loop change and return object addition as `src/App.jsx`. Failure to sync will cause CLI/UI divergence on non-zero `taxBenefitPct` runs. Unit 1 handles both files.
- **Integration coverage:** `node scripts/tests.cjs` is the integration test surface. The test group in Unit 4 directly verifies the cross-layer chain: `params → annualTaxBenefit → portfolio compounding → totalWealth`.

## Risks & Dependencies

- **Missing useMemo dep**: If `taxBenefitPctA` is not added to the deps array, the UI will silently serve a stale cached value when the slider changes. This is the highest-risk implementation pitfall. Unit 2 explicitly names the deps array update.
- **surplus display row unaffected (verified)**: The `surplus` return value is computed pre-loop from year-1 components and is a different variable than `curSurplus` inside the loop. No risk of contamination.
- **CLI backward compat**: The `= 0` default in params destructuring ensures any caller passing a params object without `taxBenefitPct` gets the pre-tax behavior unchanged. No breaking change.
- **Long-projection overstatement**: At projections > 27 years, depreciation expires but the model continues applying the benefit. This is a documented known limitation (scope boundary), not a bug.

## Documentation / Operational Notes

- `equations.md` Section 8 already documents the depreciation assumption as an intentional model choice. After this feature ships, Section 8 should be updated to note that the benefit is now configurable via the "Tax Benefit (Depreciation)" slider rather than absent from the model.
- `scripts/SKILLS.md` — if `defaults.json` is referenced there, note the new `taxBenefitPct` field.
- GitHub Pages auto-deploys from `main`; no deployment action needed beyond merging.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-27-depreciation-tax-benefit-requirements.md](../brainstorms/2026-03-27-depreciation-tax-benefit-requirements.md)
- Calculation engine: `src/App.jsx` (calcBuy, calcNeverBuy)
- CLI engine: `scripts/engine.cjs`
- Slider component pattern: `src/App.jsx:511–512`
- Row3 table pattern: `src/App.jsx:811–813`
- Calibration math: origin document, Calibration Reference table
