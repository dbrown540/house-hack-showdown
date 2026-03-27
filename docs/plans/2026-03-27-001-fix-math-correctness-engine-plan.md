---
title: "fix: Math Correctness — Engine Bugs, UI Parity, and Assumption Documentation"
type: fix
status: active
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-math-correctness-review-requirements.md
deepened: 2026-03-27
---

# fix: Math Correctness — Engine Bugs, UI Parity, and Assumption Documentation

## Overview

Two confirmed bugs exist in the House-Hack Showdown v5 calculation engine: `pmt()` returns an annual payment when rate = 0 (instead of monthly), and `calcNeverBuy` in the UI is missing `netEquityLiq` from its return object. Beyond bugs, several model assumptions need to be documented in `equations.md` so users and reviewers can evaluate the model consciously rather than discovering them through code inspection. A CLI test suite is also needed to lock in correct behavior before and after fixes.

## Problem Frame

The brainstorm identified two true bugs and several intentional-but-undocumented model assumptions. The fix order matters: establish a baseline test suite first, then apply bug fixes so regressions are detectable. Assumption documentation follows so the model's known simplifications are explicit.

(see origin: docs/brainstorms/2026-03-27-math-correctness-review-requirements.md)

## Requirements Trace

- R1 (pmt bug). `pmt(0, nper, pv)` returns `pv/nper` — an annual amount, not monthly. Must return `pv / (nper * 12)`.
- R2 (PMI assumption). PMI drop uses current appreciated home value, not original appraised value. Not a bug — a conscious model simplification. Must be documented.
- R3 (UI/CLI divergence). `calcNeverBuy` in `src/App.jsx` omits `netEquityLiq: 0` from its return object. CLI includes it. Must be aligned.
- R4 (emergency fund). Emergency fund never compounds or returns to portfolio. Documented as intentional conservative assumption.
- R5 (parity). CLI and UI produce identical `totalWealth` within ±$1 for identical inputs.
- R6 (invariants). All 15 invariants in the correctness contract pass for default inputs and the defined edge-case scenarios.

## Scope Boundaries

- Tax treatment (capital gains, depreciation, mortgage interest deduction) is out of scope — the model is pre-tax by design.
- No new sliders, UI layout changes, or new features.
- No changes to model behavior for correctly modeled assumptions (PMI on current value, income growth at 3%, vacancy rate uniform across phases).
- Negative `portfolioValue` in Phase 2 underfunded case is **not capped** — the model continues as-is; the `p2Underfunded` warning is the signal. No behavior change here.

## Context & Research

### Relevant Code and Patterns

- `src/utils/math.js` — `pmt()` helper, shared by UI. Fix here propagates to UI automatically.
- `scripts/engine.cjs` — standalone copy of `pmt()` and full calc logic. Must be kept in sync with UI manually (see CLAUDE.md).
- `scripts/compare.cjs` — CLI runner; accepts JSON params; calls `compare()` from `engine.cjs`.
- `scripts/defaults.json` — canonical default values for all params; use as baseline for tests.
- `equations.md` — formula documentation; already flags the pmt(0) bug at line 86-87.
- No test framework is configured (CLAUDE.md). Tests must be plain Node.js scripts using `assert` or manual comparison.

### Institutional Learnings

- None from `docs/solutions/` (directory does not exist yet).

### External References

- None required. Math is self-contained; no library or framework dependencies.

## Key Technical Decisions

- **Test suite as plain Node.js script**: No Vitest, Jest, or other test runner is configured and CLAUDE.md says "No test framework is configured." Use `node:assert` with `try/catch` to keep tests runnable with `node scripts/tests.cjs` without any npm install.
- **Fix `pmt()` in both files, not just one**: `src/utils/math.js` and `scripts/engine.cjs` contain identical copies. Both must be patched to avoid UI/CLI drift on the zero-rate path. A comment in each should point to the other.
- **Baseline first, then fix**: Write `scripts/tests.cjs` against the *current* engine before patching, capturing the known-incorrect value for `rate=0` as a documented failing test. Then patch and confirm the test flips to passing. This gives a regression gate before and after.
- **Assumption documentation goes in `equations.md`**: It is the canonical formula reference. `README.md` may reference it but shouldn't duplicate it.
- **Winner comparison is `totalWealth` (hold equity)**: Confirmed intentional. No change. Document it explicitly in `equations.md` section 6.

## Open Questions

### Resolved During Planning

- **Should negative portfolioValue be capped at 0 for Phase 2 underfunded?** No — the model continues with negative portfolio as a signal of over-leverage. The `p2Underfunded` flag already surfaces this. Capping would silently hide a meaningful state; the warning is the right mechanism.
- **Should PMI drop use original vs. current value?** Intentional model choice: current appreciated value. Faster PMI drop slightly favors A in high-appreciation scenarios. Documenting this assumption is sufficient; changing the behavior would require a new input (original appraised value) and is out of scope.
- **Is the rent growth reset at phase transition intentional?** Yes — `fullRent` is the expected market rent at the time of move-out, and growth restarts from there. Confirmed from equation docs and code.

### Deferred to Implementation

- **Exact assertion tolerance for parity tests**: CLI and UI both round intermediate values with `Math.round()`; final totals may differ by ±$1. The implementation should confirm whether the divergence is larger and document the accepted tolerance.
- **p2InflFactor2 when y = hackYears (p2YearsOut = -1)**: When `y == hackYears`, `p2YearsOut = -1` and `p2InflFactor2 = (1+rate)^(-1)` — a deflation factor. Currently the `inHackPhase` guard prevents this from affecting any Phase 2 costs. The test for "last hack-phase year produces no Phase 2 housing cost" validates the guard holds. If the guard is ever removed or refactored, this negative exponent would silently understate Phase 2 costs. No code change needed now, but note the fragility.
- **calcBuy parity between engine.cjs and App.jsx**: The correctness reviewer flagged that the CLI test suite confirms engine.cjs internal self-consistency but does not directly compare UI `calcBuy` to CLI `calcBuy` at the function level. Full UI/CLI parity at the numeric level is validated in Unit 5 by comparing running-app display values to CLI output — the implementer should document the observed tolerance during that check.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
Execution order:
  1. scripts/tests.cjs created  →  captures pre-fix baseline, marks rate=0 as FAIL
  2. pmt() patched in math.js   →  UI tests pass
  3. pmt() patched in engine.cjs →  CLI tests pass
  4. netEquityLiq added to UI   →  UI/CLI parity for Option B return shape
  5. equations.md updated       →  PMI assumption, emergency fund, income growth, winner basis
  6. Full invariant validation  →  run tests.cjs, verify all 15 invariants, do parity diff

Test matrix structure (scripts/tests.cjs):
  - load engine.cjs via require()
  - run each scenario with assert.strictEqual / assert.ok
  - print PASS / FAIL per test with expected vs. actual values
  - exit code 1 if any test fails, 0 if all pass
```

## Implementation Units

- [x] **Unit 1: CLI Test Suite (Baseline)**

**Goal:** Create `scripts/tests.cjs` to lock in correct engine behavior and provide a regression gate. Run before any code changes. Record one known-failing test for the pmt(0) bug so the fix can be verified.

**Requirements:** R1, R5, R6

**Dependencies:** None (runs against current engine).

**Files:**
- Create: `scripts/tests.cjs`

**Approach:**
- Use `require('./engine.cjs')` and Node's built-in `assert` module. No npm dependencies.
- Implement a minimal `runTest(label, actual, expected, tolerance=0)` helper that prints PASS/FAIL and exits non-zero on any failure.
- Cover each of the 15 engine-level scenarios from the correctness contract plus the additional gaps below.
- **Baseline capture strategy**: Default-params baselines (rate=5.875%) are unaffected by the pmt fix and are safe to capture before any code changes — the zero-rate bug only activates when `rate === 0`. Capture default-param expected values first (run the engine once and record the output), then hard-code them. For the `rate=0` scenario, capture the current (wrong) value in a comment block labeled `// EXPECTED FAIL before fix — pre-fix value: X, post-fix expected: Y` so the test documents both states.
- Include a comment at the top: `// Run: node scripts/tests.cjs`

**Test scenarios:**

*Happy path / baseline:*
- Default params → `totalWealth` for A and B matches hard-coded expected values (captured from initial engine run, unaffected by pmt fix).
- Default params → `yearlyData` has exactly `years + 1` entries (year 0 through year N).
- `compare()` with default params → `winner`, `totalWealth`, `margin` are defined and consistent.

*Invariants — amortization:*
- Invariant I2: `balance` post-clamp is `>= 0` at all years in `yearlyData`. Additionally, verify that for a standard 30-year amortization at any positive rate, the loan is fully paid off at or before year 30 (`balance === 0` by year 30).
- Invariant I3: `p2Balance >= 0` for all years (Phase 2 buy scenario with `phase2DownPct = 3`).
- Phase 2 transition: `p2Balance` at `yearlyData[hackYears + 1]` equals the expected value after exactly 12 months of amortization on `p2Loan` at `phase2MortRate` (compute reference value independently with a loop).

*Invariants — wealth:*
- Invariant I9: `totalWealthLiq <= totalWealth` for Option A whenever `sellingCostPct > 0`.
- Invariant I10: `homeValue === price` when `appRate = 0`.
- Invariant I11: `inflFactor = 1.0` at year 1 in all inflated quantities when `inflationRate = 0`.
- Zero-return compounding: when `investRet = 0`, final `portfolioValue` for Option B equals `startingCapital + sum(curSurplus_y * 12)` across all years (verifies mid-year formula degenerates correctly at r=0).

*Invariants — PMI:*
- Invariant I12: `monthlyPMI === 0` for all years when `downPct >= 20`.
- High appreciation: when `appRate = 10`, PMI drops within the first few years for `downPct = 3` — verify PMI is 0 by year 3 in `yearlyData`.

*Phase transitions:*
- `hackYears = 0`: Phase 2 triggers at `y = 1`; `yearlyData[0].netEquity > 0` (home purchased); full rent collected from first year.
- `hackYears >= years`: Phase 2 never triggers; assert `p2NetEquity === 0`, `p2Balance === 0`, AND `p2Down === 0` (distinguish not-triggered from triggered-but-zero-equity).
- Last hack-phase year (`y == hackYears`): No Phase 2 personal housing cost regardless of `phase2Mode`.
- Phase 2 rent transition: `rentGrowth = 2`, `hackYears = 2`, `years = 10` — assert `yearlyData[3].netEquity` uses full rent with growth exponent 0 (no growth applied in first Phase 2 year).

*Edge cases:*
- `downPct = 20`, `pmiRate = 1`: PMI never applied.
- `rate = 0`: **EXPECTED FAIL before fix.** Document pre-fix value (`pv/nper = annual`) and post-fix expected value (`pv/(nper*12) = monthly`) in a comment block. Test asserts post-fix value.
- Underfunded A: `startingCapital = 10000`, `pA = 300000` → `underfunded === true`, `portfolioValue === 0` at year 0.
- Phase 2 underfunded: params where `portfolioValue < p2TotalCash` at transition → `p2Underfunded === true`.
- Negative surplus: params where monthly income is significantly less than expenses — assert `yearlyData.totalWealth` is `portfolioValue + holdEquity` (possibly negative portfolio + positive equity); behavior is intentional (no clamping).

*Sensitivity analysis:*
- Invariant I14: When A wins, `spBreakeven >= investRet - 0.1` (tolerance for floating-point at narrow margins).
- When B wins (e.g., `investRet = 15`, `appA = 0`): `spBreakeven === investRet` exactly.

*CLI/UI parity (engine-level):*
- Run `calcBuy` via both `require('./engine.cjs')` and a param-equivalent call; assert all numeric return keys match within ±$1. (Note: this test validates engine.cjs internal consistency. Full UI/CLI parity is verified in Unit 5 with the running UI.)

**Verification:**
- `node scripts/tests.cjs` runs without crashing.
- All tests pass except the explicitly labeled pmt(0) test.
- Exit code is non-zero until pmt(0) is fixed.

---

- [ ] **Unit 2: Fix pmt() Zero-Rate Bug**

**Goal:** Correct `pmt()` so it returns a monthly payment when `rate = 0`.

**Requirements:** R1

**Dependencies:** Unit 1 must exist (to confirm the test flips from fail to pass).

**Files:**
- Modify: `src/utils/math.js` (line 3 / rate=0 branch)
- Modify: `scripts/engine.cjs` (line 13 / same branch)

**Approach:**
- Change the zero-rate branch from `return pv / nper` to `return pv / (nper * 12)`.
- Add an inline comment in each file: `// returns monthly payment; nper is in years`.
- Add a matching comment in the other file referencing the copy: `// Keep in sync with scripts/engine.cjs` (in math.js) and `// Keep in sync with src/utils/math.js` (in engine.cjs).
- Do not change any other behavior of `pmt()`.

**Patterns to follow:**
- `src/utils/math.js:1-6` — existing function shape.

**Test scenarios:**
- Happy path: `pmt(0, 30, 300000)` → `300000 / (30 * 12) = 833.33` (monthly, not 10000).
- Happy path: `pmt(0.05, 30, 300000)` → result unchanged from before fix (non-zero rate branch not touched).
- Edge case: `pmt(0, 1, 12000)` → `1000` (monthly payment for 1-year zero-rate loan).

**Verification:**
- `node scripts/tests.cjs` exits with code 0 (all tests pass, including the previously-failing pmt(0) test).
- A spot-check in the UI dev server with `rate = 0` shows a plausible PITI value rather than an impossibly large one.

---

- [ ] **Unit 3: Fix UI/CLI Return Object Parity for calcNeverBuy**

**Goal:** Add `netEquityLiq: 0` to the `calcNeverBuy` return object in `src/App.jsx` to match the CLI engine's return shape.

**Requirements:** R3, R5

**Dependencies:** Unit 2 (code is in a clean state post-fix).

**Files:**
- Modify: `src/App.jsx` (calcNeverBuy return object, around line 296)

**Approach:**
- Locate the `calcNeverBuy` return object in the UI.
- Add `netEquityLiq: 0` alongside `netEquity: 0` and `grossEquity: 0`.
- No logic change — the value is always 0 for Option B.
- Verify the returned field is not already consumed elsewhere in the UI in a way that would conflict.

**Patterns to follow:**
- `scripts/engine.cjs` calcNeverBuy return (line 281) — the CLI version is the reference shape.

**Test scenarios:**
- Key parity: `calcNeverBuy` return in the CLI contains all expected keys including `netEquityLiq: 0`. After the UI fix, verify by reading the return object shape that the UI version matches.
- Value correctness: `b.netEquityLiq` is `0` (not `undefined`). Since `fmt(undefined)` renders `"—"` and `fmt(0)` renders `"$0"`, the test should verify the value is exactly `0`, not just truthy.
- No side effects: `totalWealth` and `portfolioValue` for Option B are identical before and after this change.
- `calcNeverBuy` ignores `phase2Mode`: assert that passing `phase2Mode: "buy"` vs. `phase2Mode: "rent"` to the CLI `calcNeverBuy` produces identical output (confirming no accidental coupling).

**Verification:**
- `scripts/tests.cjs` parity check for `calcNeverBuy` return shape passes.
- `node scripts/tests.cjs` still exits with code 0 after the UI change.

---

- [ ] **Unit 4: Document Model Assumptions in equations.md**

**Goal:** Make all intentional-but-previously-implicit model assumptions explicit in the canonical formula reference, so reviewers and users understand the model without needing to read the code.

**Requirements:** R2, R4, and documentation completeness.

**Dependencies:** None (documentation only; can run in parallel with Unit 3 or after).

**Files:**
- Modify: `equations.md`

**Approach:**

Add a new **Section 8: Model Assumptions and Known Simplifications** at the end of `equations.md`. Each assumption entry should include:
- The assumption name
- How it is implemented
- Why it was chosen
- Real-world alternative (for context)

Cover these five assumptions:

1. **PMI drop uses current appreciated value** — `monthlyPMI = balance > 0.8 * curHomeValue`. Real-world PMI rules typically use the original appraised value unless a formal reappraisal is ordered. This model uses current value, which causes PMI to drop faster in high-appreciation scenarios, slightly favoring Option A. A future enhancement could add an `originalHomeValue` input.

2. **Emergency fund never compounds** — `emergencyFund` is deducted from `startingCapital` and removed from all wealth calculations permanently. It is a conservative assumption that disadvantages Option A. In practice, emergency funds held in money-market accounts do earn returns.

3. **Income growth hardcoded at 3% per year** — `curTakeHome = monthlyIncome * 1.03^(y-1)`. This is independent of `inflationRate`. When `inflationRate > 3%`, real income declines in the model. A future slider could make income growth configurable.

4. **Vacancy/maintenance rate applied uniformly across phases** — `maintVacancyPct` is used in Phase 1 (owner-occupied with partial rent) and Phase 2 (full rental) identically. Vacancy risk differs between these phases in practice.

5. **Winner comparison uses hold equity (no selling costs)** — `totalWealth = portfolioValue + homeValue - balance`. Liquidation equity (selling costs deducted) is shown as secondary. This means the winner is determined assuming the property is held, not sold, at the evaluation horizon.

Also update the existing pmt(0) note in Section 3 to read "**Fixed in v5.1**: `pmt(0, nper, pv)` now correctly returns `pv / (nper * 12)` (monthly). Previously returned an annual amount."

**Test scenarios:**
- Spot-check: Verify the five assumption descriptions accurately reflect the actual code in `engine.cjs`.
- Verify the pmt(0) note is updated to "Fixed" rather than still calling it a bug.

**Verification:**
- `equations.md` contains Section 8 with all five assumptions.
- pmt(0) note in Section 3 is updated to reflect the fix.
- No formulas in equations.md are altered (documentation only).

---

- [ ] **Unit 5: Final Invariant Validation and Parity Check**

**Goal:** Run the complete test suite and confirm all invariants hold. Manually verify CLI/UI parity for default params.

**Requirements:** R5, R6 (all invariants I1–I15).

**Dependencies:** All previous units complete.

**Files:**
- No file changes expected. If a test fails, trace back to the relevant unit and fix.
- Possibly modify: `scripts/tests.cjs` to add any invariant scenarios revealed during this pass.

**Approach:**
- Run `node scripts/tests.cjs` — all 15+ tests must pass.
- Run `node scripts/compare.cjs` (default params) and capture `totalWealth`, `portfolioValue`, `balance`, `netEquity` for both A and B.
- Open the UI dev server at the same default params and compare the matching display values.
- Confirm the difference is ≤ $1 for each field (acceptable rounding from `Math.round()` on intermediate values).
- If any parity divergence exceeds $1, trace the source and fix it.

**Test scenarios:**
- Full invariant sweep: I1–I15 as listed in the correctness contract.
- Parity: Default params — CLI vs. UI output for `totalWealth` A, `totalWealth` B, `balance`, `netEquity`, `homeValue`, `surplus`, `cashToClose`, `leftoverCapital`.
- Regression: Compare CLI output before and after the fix for the pmt(0) scenario (`rate=0`). Document the before/after values in a code comment in `tests.cjs`.

**Verification:**
- `node scripts/tests.cjs` exits with code 0.
- CLI/UI parity confirmed within ±$1 for default params.
- All 15 invariants documented as passing in the test output.

---

## System-Wide Impact

- **Interaction graph**: `pmt()` is called in both `calcBuy` (for the property 1 and phase 2 mortgages) and nowhere else. The fix is isolated to zero-rate inputs only.
- **Error propagation**: The zero-rate bug produced a payment ~12× too high, inflating PITI and suppressing surplus for Option A, making Option A look worse than reality when rate = 0. After the fix, Option A improves in zero-rate scenarios.
- **State lifecycle risks**: No persistent state or caching. All values recomputed from React state on every render via `useMemo`.
- **API surface parity**: `pmt()` is exported from both `src/utils/math.js` and `scripts/engine.cjs`. Both must be patched identically. The UI does not currently guard against `rate = 0` in its slider range (slider min is 4% per SKILLS.md), so the bug is unreachable via normal UI interaction — but it is reachable via CLI.
- **Integration coverage**: The CLI is the primary integration test surface. `node scripts/tests.cjs` covers the integration between params → engine → output shape.

## Risks & Dependencies

- **Risk: Over-fixing in pmt(0)**. Only the zero-rate branch changes. The non-zero branch (`r > 0`) must not be touched. The test for `pmt(0.05, 30, 300000)` guards this.
- **Risk: UI slider range hides the bug from users**. The mortgage rate slider minimum is 4% (per SKILLS.md), so users cannot reach `rate = 0` through the UI. The fix is primarily for CLI correctness and future-proofing. Document this in the test comment.
- **Risk: pmt() in engine.cjs not synced**. The engine is a manual copy of the UI logic (CLAUDE.md confirms this). If only `math.js` is patched, the CLI remains broken for rate=0. Unit 2 explicitly requires both files.
- **Risk: netEquityLiq missing field causes downstream crash if UI code tries to access it**. Currently not a runtime crash (Option B simply never shows equity rows), but adding the field eliminates any future fragility.
- **Rollback**: All changes are additive or one-line fixes. Git revert of any individual commit restores prior state. The test suite (`scripts/tests.cjs`) stays as a permanent asset post-rollback.

## Documentation / Operational Notes

- `equations.md` is the durable reference for this model. Update it in the same PR as code fixes.
- The `scripts/tests.cjs` file should be mentioned in `scripts/SKILLS.md` under a new "Validation" section so future contributors know it exists.
- No deployment changes needed. GitHub Pages auto-deploys from `main`.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-27-math-correctness-review-requirements.md](../brainstorms/2026-03-27-math-correctness-review-requirements.md)
- Calculation engine: `scripts/engine.cjs`
- UI calc: `src/App.jsx` (calcBuy, calcNeverBuy)
- Math helpers: `src/utils/math.js`
- Formula reference: `equations.md`
- CLI docs: `scripts/SKILLS.md`
