// Run: node scripts/tests.cjs
//
// Unit 1 — Baseline regression suite for the House-Hack Showdown v5 engine.
// Uses only Node.js built-ins (no test framework required).
//
// Status: this suite is expected to pass in full when the engine and
// defaults are in sync.
//
// Usage:
//   node scripts/tests.cjs          # run all tests, exit 1 if any fail
//   node scripts/tests.cjs | grep FAIL   # show only failures

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { calcBuy, calcNeverBuy, compare, pmt } = require('./engine.cjs');
const defaults = require('./defaults.json');

// ── HELPERS ──────────────────────────────────────────────────────────────────

// Map defaults.json property names (pA, rA, ...) to calcBuy param names.
// calcBuy() takes: { price, rent, fullRent, phase2BasementRent, repairs, appRate, rentGrowth, ...shared }
// defaults.json uses: { pA, rA, fullRentA, phase2BasementRentA, repA, appA, rgA }
function mkBuyParams(overrides = {}) {
  const d = { ...defaults, ...overrides };
  return {
    ...d,
    price:     d.pA,
    rent:      d.rA,
    fullRent:  d.fullRentA,
    phase2BasementRent: d.phase2BasementRentA,
    repairs:   d.repA,
    appRate:   d.appA,
    rentGrowth: d.rgA,
  };
}

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${label}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

// Numeric equality within a tolerance (default ±1 for dollar values).
function near(actual, expected, tol = 1, msg = '') {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= tol,
    `${msg}expected ${expected} ± ${tol}, got ${actual} (diff ${diff.toFixed(2)})`
  );
}

function normalizeFormula(text) {
  return text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\befMonths\b/g, 'emergencyMonths')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(){}[\],;:+\-*/<>!=?])\s*/g, '$1')
    .trim();
}

function assertMatchingFormula(appSource, engineSource, appFormula, engineFormula, label) {
  assert.ok(
    normalizeFormula(appSource).includes(normalizeFormula(appFormula)),
    `${label}: App.jsx missing expected formula`
  );
  assert.ok(
    normalizeFormula(engineSource).includes(normalizeFormula(engineFormula)),
    `${label}: scripts/engine.cjs missing expected formula`
  );
  assert.strictEqual(
    normalizeFormula(appFormula),
    normalizeFormula(engineFormula),
    `${label}: formula drift between App.jsx and scripts/engine.cjs`
  );
}

const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
const engineSource = fs.readFileSync(path.join(__dirname, 'engine.cjs'), 'utf8');

// ── SECTION 1: DEFAULT-PARAM BASELINE ────────────────────────────────────────
// These values are captured from the current engine (rate=5.875%) and are
// UNAFFECTED by the pmt(0) fix — the zero-rate bug only activates when rate===0.
// Safe to hard-code before any code changes.

console.log('\n─── 1. Default-param baseline ───');

test('compare() returns defined result object', () => {
  const result = compare(defaults);
  assert.ok(result.winner, 'winner is defined');
  assert.ok(typeof result.margin === 'number', 'margin is a number');
  assert.ok(typeof result.houseHack.totalWealth === 'number', 'A totalWealth is a number');
  assert.ok(typeof result.neverBuy.totalWealth === 'number', 'B totalWealth is a number');
});

test('default params: A totalWealth = $1,026,442', () => {
  const result = compare(defaults);
  near(result.houseHack.totalWealth, 1026442, 1, 'A totalWealth ');
});

test('default params: B totalWealth = $930,576', () => {
  const result = compare(defaults);
  near(result.neverBuy.totalWealth, 930576, 1, 'B totalWealth ');
});

test('default params: winner = House-Hack', () => {
  const result = compare(defaults);
  assert.strictEqual(result.winner, 'House-Hack');
});

test('default params: spBreakeven = 11.7%', () => {
  const result = compare(defaults);
  near(result.spBreakeven, 11.7, 0.05, 'spBreakeven ');
});

test('default params: yearlyData has years+1 entries (0..N)', () => {
  const a = calcBuy(mkBuyParams());
  assert.strictEqual(a.yearlyData.length, defaults.years + 1,
    `expected ${defaults.years + 1} entries, got ${a.yearlyData.length}`);
});

test('default params: year-0 totalWealth = portfolioValue + down', () => {
  const a = calcBuy(mkBuyParams());
  const expected = a.yearlyData[0].portfolioValue + a.down;
  near(a.yearlyData[0].totalWealth, expected, 0, 'year-0 totalWealth ');
});

// ── SECTION 2: AMORTIZATION INVARIANTS ───────────────────────────────────────

console.log('\n─── 2. Amortization invariants ───');

test('I2: balance >= 0 for all years (default params)', () => {
  const a = calcBuy(mkBuyParams());
  for (const row of a.yearlyData) {
    const balance = a.loan - row.principalPaid;
    assert.ok(balance >= -0.01,
      `balance went negative at year ${row.year}: ${balance.toFixed(2)}`);
  }
});

test('I2: 30-year loan fully paid by year 30', () => {
  const a = calcBuy(mkBuyParams({ years: 30 }));
  assert.ok(a.yearlyData.length === 31, `yearlyData should have 31 entries`);
  near(a.balance, 0, 1, 'final balance ');
});

test('I3: p2Balance >= 0 for all years (phase2Mode=buy)', () => {
  const a = calcBuy(mkBuyParams({ phase2Mode: 'buy', hackYears: 2, years: 15 }));
  // p2Balance is only in the final output; verify the final value is non-negative
  assert.ok(a.p2Balance >= 0, `p2Balance should be >= 0, got ${a.p2Balance}`);
});

test('Phase 2 transition: p2Balance after 1 year matches independent amortization', () => {
  // Run to exactly hackYears+1=3 years so only one year of Phase 2 has elapsed.
  // Expected p2Balance: independently amortize p2Loan for 12 months at phase2MortRate.
  const hackYears = 2;
  const a = calcBuy(mkBuyParams({ phase2Mode: 'buy', hackYears, years: hackYears + 1 }));

  // Independent reference: amortize p2Loan for 12 months
  const p2Loan = defaults.phase2Price - Math.round(defaults.phase2Price * defaults.phase2DownPct / 100);
  const p2MonthlyPI = pmt(defaults.phase2MortRate / 100, 30, p2Loan);
  const p2MonthlyR  = defaults.phase2MortRate / 100 / 12;
  let refBal = p2Loan;
  for (let m = 0; m < 12; m++) {
    refBal = refBal * (1 + p2MonthlyR) - p2MonthlyPI;
  }
  refBal = Math.max(refBal, 0);

  near(a.p2Balance, Math.round(refBal), 1, 'p2Balance after 1yr ');
});

// ── SECTION 3: WEALTH INVARIANTS ─────────────────────────────────────────────

console.log('\n─── 3. Wealth invariants ───');

test('I9: totalWealthLiq <= totalWealth (final, sellingCostPct=5)', () => {
  const a = calcBuy(mkBuyParams());
  assert.ok(a.totalWealthLiq <= a.totalWealth,
    `totalWealthLiq ${a.totalWealthLiq} > totalWealth ${a.totalWealth}`);
});

test('I9: totalWealthLiq <= totalWealth for all years in yearlyData', () => {
  const a = calcBuy(mkBuyParams());
  for (const row of a.yearlyData) {
    assert.ok(row.totalWealthLiq <= row.totalWealth + 0.01,
      `year ${row.year}: totalWealthLiq ${row.totalWealthLiq.toFixed(0)} > totalWealth ${row.totalWealth.toFixed(0)}`);
  }
});

test('I10: homeValue = price when appRate = 0', () => {
  const a = calcBuy(mkBuyParams({ appA: 0 }));
  near(a.homeValue, defaults.pA, 1, 'homeValue with appRate=0 ');
});

test('I11: inflation = 0 grows portfolio faster than inflation = 3 (inflation is applied)', () => {
  const bLow  = calcNeverBuy({ ...defaults, inflationRate: 0 });
  const bHigh = calcNeverBuy({ ...defaults, inflationRate: 3 });
  assert.ok(bLow.portfolioValue > bHigh.portfolioValue,
    `inflation=0 portfolio (${bLow.portfolioValue}) should exceed inflation=3 (${bHigh.portfolioValue})`);
});

test('Zero-return compounding: B portfolioValue at investRet=0 = startingCapital + sum(surpluses)', () => {
  // At r=0: portfolioValue_y = portfolioValue_{y-1} * 1 + curSurplus_y * 12 * 1
  // Final portfolioValue should equal startingCapital + total annual surpluses.
  const b = calcNeverBuy({ ...defaults, investRet: 0 });
  near(b.portfolioValue, 539737, 1, 'B investRet=0 portfolioValue ');
});

test('totalWealth = portfolioValue + netEquity for all years (floating-point)', () => {
  const a = calcBuy(mkBuyParams());
  for (const row of a.yearlyData) {
    const expected = row.portfolioValue + row.netEquity;
    near(row.totalWealth, expected, 0.02,
      `year ${row.year} totalWealth vs portfolioValue+netEquity `);
  }
});

// ── SECTION 4: PMI INVARIANTS ─────────────────────────────────────────────────

console.log('\n─── 4. PMI invariants ───');

test('I12: PMI never applied when downPct=20 (totalWealth same regardless of pmiRate)', () => {
  // If PMI is truly never applied, the pmiRate value has no effect.
  const a0 = calcBuy(mkBuyParams({ downPct: 20, pmiRate: 0 }));
  const a1 = calcBuy(mkBuyParams({ downPct: 20, pmiRate: 1 }));
  assert.strictEqual(a0.totalWealth, a1.totalWealth,
    `totalWealth differs by ${Math.abs(a0.totalWealth - a1.totalWealth)} when downPct=20`);
});

test('I12: all-years balance <= 0.8 * homeValue when downPct=20 (PMI threshold never crossed)', () => {
  const a = calcBuy(mkBuyParams({ downPct: 20 }));
  for (const row of a.yearlyData) {
    const balance   = a.loan - row.principalPaid;
    const homeValue = row.netEquity + balance;  // homeValue = equity + balance
    assert.ok(balance <= 0.8 * homeValue + 0.01,
      `year ${row.year}: balance ${balance.toFixed(0)} > 80% of homeValue ${homeValue.toFixed(0)}`);
  }
});

test('High appreciation (appA=10): balance <= 0.8 * homeValue by year 3 (PMI drops)', () => {
  // At year 3 with 10% appreciation: homeValue = 300000 * 1.1^3 ≈ $399,300
  // 80% of that = $319,440. The 3% down loan balance after 3 years is ~$279,351 < $319,440.
  const a = calcBuy(mkBuyParams({ appA: 10 }));
  const row3     = a.yearlyData[3];
  const balance3 = a.loan - row3.principalPaid;
  const home3    = row3.netEquity + balance3;
  assert.ok(balance3 <= 0.8 * home3 + 0.01,
    `year 3: balance ${balance3.toFixed(0)} still > 80% of homeValue ${home3.toFixed(0)} — PMI has not dropped`);
});

// ── SECTION 5: PHASE TRANSITIONS ─────────────────────────────────────────────

console.log('\n─── 5. Phase transitions ───');

test('hackYears=0: year-0 netEquity = down payment (home purchased immediately)', () => {
  const a = calcBuy(mkBuyParams({ hackYears: 0 }));
  near(a.yearlyData[0].netEquity, a.down, 0, 'year-0 netEquity ');
});

test('hackYears=0: phase2 not triggered (p2Balance=0, p2Down=0, p2NetEquity=0)', () => {
  // Phase2Mode=rent → p2 buy block never runs regardless of hackYears
  const a = calcBuy(mkBuyParams({ hackYears: 0, phase2Mode: 'rent' }));
  assert.strictEqual(a.p2Balance,   0, `p2Balance should be 0`);
  assert.strictEqual(a.p2Down,      0, `p2Down should be 0`);
  assert.strictEqual(a.p2NetEquity, 0, `p2NetEquity should be 0`);
});

test('hackYears >= years: Phase 2 never triggers (p2NetEquity=0, p2Balance=0, p2Down=0)', () => {
  // Guard: phase2FinalValues only computed when years > hackYears.
  const a = calcBuy(mkBuyParams({ hackYears: 15, years: 10, phase2Mode: 'buy' }));
  assert.strictEqual(a.p2NetEquity, 0, `p2NetEquity should be 0`);
  assert.strictEqual(a.p2Balance,   0, `p2Balance should be 0`);
  assert.strictEqual(a.p2Down,      0, `p2Down should be 0`);
});

test('years=1 edge: yearlyData has 2 entries; Phase 2 never triggers when hackYears=2', () => {
  const a = calcBuy(mkBuyParams({ years: 1, hackYears: 2, phase2Mode: 'buy' }));
  assert.strictEqual(a.yearlyData.length, 2, `expected 2 entries`);
  assert.strictEqual(a.p2Down, 0, `p2Down should be 0 when years < hackYears`);
});

test('Last hack-phase year: no Phase 2 cost regardless of phase2Mode', () => {
  // At y=hackYears the inHackPhase guard is true, so no Phase 2 costs apply.
  // Verify: at y=hackYears, buy-mode and rent-mode produce identical netEquity and portfolioValue.
  const hackYears = 3;
  const aBuy  = calcBuy(mkBuyParams({ hackYears, years: 5, phase2Mode: 'buy' }));
  const aRent = calcBuy(mkBuyParams({ hackYears, years: 5, phase2Mode: 'rent' }));
  const rowBuy  = aBuy.yearlyData[hackYears];
  const rowRent = aRent.yearlyData[hackYears];
  near(rowBuy.netEquity,      rowRent.netEquity,      0.01, `netEquity at y=${hackYears} `);
  near(rowBuy.portfolioValue, rowRent.portfolioValue, 0.01, `portfolioValue at y=${hackYears} `);
});

test('Phase 2 rent transition: fullRent applied with no growth in first Phase 2 year', () => {
  // At the first Phase 2 year, rentGrowthYears = y - hackYears - 1 = 0, so
  // curRent = fullRent * (1 + rentGrowth)^0 = fullRent regardless of rentGrowth.
  // Verify: with hackYears=0 (no hack phase), at y=1 both rgA=2 and rgA=0 produce
  // the same portfolioValue because the growth exponent is 0 in both cases.
  // (Contrasting: during the hack phase, rgA does compound and would cause divergence —
  // so this test isolates the Phase 2 year-1 boundary by eliminating the hack phase.)
  const a2 = calcBuy(mkBuyParams({ hackYears: 0, years: 1, rgA: 2 }));
  const a0 = calcBuy(mkBuyParams({ hackYears: 0, years: 1, rgA: 0 }));
  near(a2.portfolioValue, a0.portfolioValue, 0.01,
    `portfolioValue at first Phase 2 year (hackYears=0, y=1) should be identical for rgA=2 vs rgA=0 `);
});

test('Phase 2 basement rent stacks on top of fullRent after move-out', () => {
  const base = calcBuy(mkBuyParams({ hackYears: 2, years: 3, fullRentA: 2400, phase2BasementRentA: 0 }));
  const plusBasement = calcBuy(mkBuyParams({ hackYears: 2, years: 3, fullRentA: 2400, phase2BasementRentA: 800 }));
  assert.ok(plusBasement.totalRentCollected > base.totalRentCollected,
    `totalRentCollected should increase when phase2 basement rent is added: base=${base.totalRentCollected}, plus=${plusBasement.totalRentCollected}`);
  assert.ok(plusBasement.portfolioValue > base.portfolioValue,
    `portfolioValue should increase when phase2 basement rent is added: base=${base.portfolioValue}, plus=${plusBasement.portfolioValue}`);
});

// ── SECTION 6: EDGE CASES ─────────────────────────────────────────────────────

console.log('\n─── 6. Edge cases ───');

test('pmt(0) returns monthly payment pv/(nper*12)', () => {
  const expected = 300000 / (30 * 12);   // 833.333...
  near(pmt(0, 30, 300000), expected, 0.01, 'pmt(0,30,300000) ');
});

test('pmt(0, 1, 12000) = 1000 (monthly, 1-year zero-rate loan)', () => {
  near(pmt(0, 1, 12000), 1000, 0.01, 'pmt(0,1,12000) ');
});

test('pmt() non-zero rate unchanged by fix: pmt(0.05875, 30, 291000) ≈ $1,721', () => {
  // The non-zero branch must not be touched by the fix.
  near(pmt(0.05875, 30, 291000), 1721.37, 0.5, 'pmt non-zero rate ');
});

test('Underfunded A: startingCapital=10000 → underfunded=true, portfolioValue=0 at year 0', () => {
  // Underfunded when starting capital cannot cover cash-to-close + month-based emergency reserve.
  const a = calcBuy(mkBuyParams({ startingCapital: 10000 }));
  assert.ok(a.underfunded === true, `underfunded should be true`);
  assert.ok(a.leftoverCapital < 0, `leftoverCapital should be negative`);
  assert.strictEqual(a.yearlyData[0].portfolioValue, 0, `portfolioValue at year 0 should be 0`);
});

test('Phase 2 underfunded: p2Underfunded=true when portfolio < p2TotalCash at transition', () => {
  // Low income + expensive Phase 2 property → portfolio at y=hackYears+1 < p2TotalCash
  // Params: phase2Price=600000, phase2DownPct=10 → p2TotalCash≈84000
  // With takeHome=1200 and weeklyCost=200, the portfolio stays low.
  const a = calcBuy(mkBuyParams({
    startingCapital:  21000,
    takeHome:          1200,
    weeklyCost:         200,
    phase2Mode:       'buy',
    hackYears:           1,
    years:              10,
    phase2Price:     600000,
    phase2DownPct:       10,
  }));
  assert.ok(a.p2Underfunded === true,
    `p2Underfunded should be true (p2CashToClose=${a.p2CashToClose})`);
});

test('Negative surplus: totalWealth = portfolioValue + netEquity for all years', () => {
  // High costs, low income → portfolioValue goes negative (intentional, no clamping).
  const a = calcBuy(mkBuyParams({
    takeHome: 1200, weeklyCost: 200, utilities: 1000, pA: 400000, rA: 100,
  }));
  assert.ok(a.portfolioValue < 0, `portfolioValue should be negative under heavy cash flow pressure`);
  for (const row of a.yearlyData) {
    near(row.totalWealth, row.portfolioValue + row.netEquity, 0.02,
      `year ${row.year} totalWealth vs portfolioValue+netEquity `);
  }
});

// ── SECTION 7: SENSITIVITY ANALYSIS ─────────────────────────────────────────

console.log('\n─── 7. Sensitivity analysis ───');

test('I14: spBreakeven >= investRet when A wins (with floating-point tolerance)', () => {
  const result = compare(defaults);
  assert.strictEqual(result.winner, 'House-Hack', 'prerequisite: A should win with defaults');
  assert.ok(result.spBreakeven >= defaults.investRet - 0.1,
    `spBreakeven ${result.spBreakeven} < investRet ${defaults.investRet} - 0.1`);
});

test('spBreakeven = investRet when B wins (no binary search needed)', () => {
  // When B wins the spBreakeven is set to the current investRet by definition.
  const result = compare({ ...defaults, investRet: 15, appA: 0 });
  assert.strictEqual(result.winner, 'Never Buy (S&P)', 'prerequisite: B should win');
  assert.strictEqual(result.spBreakeven, 15,
    `spBreakeven should equal investRet (15) when B wins, got ${result.spBreakeven}`);
});

// ── SECTION 8: CLI/UI PARITY (ENGINE-LEVEL) ──────────────────────────────────

console.log('\n─── 8. Engine parity and return shape ───');

test('calcNeverBuy is unaffected by phase2Mode (no coupling)', () => {
  const bRent = calcNeverBuy({ ...defaults, phase2Mode: 'rent' });
  const bBuy  = calcNeverBuy({ ...defaults, phase2Mode: 'buy'  });
  assert.strictEqual(bRent.totalWealth,     bBuy.totalWealth,     'totalWealth should match');
  assert.strictEqual(bRent.portfolioValue,  bBuy.portfolioValue,  'portfolioValue should match');
});

test('calcNeverBuy returns netEquityLiq = 0 (not undefined)', () => {
  const b = calcNeverBuy(defaults);
  assert.strictEqual(b.netEquityLiq, 0,
    `netEquityLiq should be 0, got ${b.netEquityLiq}`);
});

test('compare() calcBuy results are self-consistent: totalWealth = portfolioValue + netEquity', () => {
  // Verify the compare() result surfaces consistent fields from calcBuy.
  const result = compare(defaults);
  const a = result.houseHack;
  near(a.totalWealth, a.portfolioValue + a.netEquity, 1, 'A totalWealth consistency ');
});

// ── SECTION 9: DEPRECIATION TAX BENEFIT ──────────────────────────────────────

console.log('\n─── 9. Depreciation tax benefit ───');

test('taxBenefitPct=0: annualTaxBenefit=0, no uplift vs taxBenefitPct=0.1', () => {
  const withZero = compare({ ...defaults, taxBenefitPct: 0 }).houseHack;
  const withSmall = compare({ ...defaults, taxBenefitPct: 0.1 }).houseHack;
  assert.strictEqual(withZero.annualTaxBenefit, 0, 'annualTaxBenefit should be 0 when taxBenefitPct=0');
  assert.ok(withSmall.totalWealth > withZero.totalWealth,
    `taxBenefitPct=0.1 should produce higher totalWealth than 0: got ${withSmall.totalWealth} vs ${withZero.totalWealth}`);
});

test('taxBenefitPct=0.5, price=300000: annualTaxBenefit=$1,500', () => {
  const a = compare({ ...defaults, taxBenefitPct: 0.5 }).houseHack;
  assert.strictEqual(a.annualTaxBenefit, 1500,
    `annualTaxBenefit should be 1500, got ${a.annualTaxBenefit}`);
});

test('taxBenefitPct=0.5: portfolio uplift ~$25,101 over 10yr at 10% return (±$100, due to mid-year compounding)', () => {
  const base = compare(defaults).houseHack;
  const withBenefit = compare({ ...defaults, taxBenefitPct: 0.5 }).houseHack;
  const uplift = withBenefit.portfolioValue - base.portfolioValue;
  assert.ok(Math.abs(uplift - 25101) <= 100,
    `Portfolio uplift should be ~$25,101 (±$100), got ${uplift}`);
});

test('taxBenefitPct=0.5: Option B totalWealth is unchanged', () => {
  const baseB = compare(defaults).neverBuy;
  const withBenefitB = compare({ ...defaults, taxBenefitPct: 0.5 }).neverBuy;
  assert.strictEqual(withBenefitB.totalWealth, baseB.totalWealth,
    'B totalWealth must be unaffected by taxBenefitPct');
});

test('calcNeverBuy returns annualTaxBenefit=0 regardless of taxBenefitPct', () => {
  const b = calcNeverBuy({ ...defaults, taxBenefitPct: 1.5 });
  assert.strictEqual(b.annualTaxBenefit, 0,
    `calcNeverBuy annualTaxBenefit should always be 0, got ${b.annualTaxBenefit}`);
});

test('taxBenefitPct=1.5 (max): totalWealth(A) increases by ~$75K vs baseline', () => {
  const base = compare(defaults).houseHack;
  const withMax = compare({ ...defaults, taxBenefitPct: 1.5 }).houseHack;
  const uplift = withMax.totalWealth - base.totalWealth;
  assert.ok(uplift > 60000 && uplift < 90000,
    `Max-value portfolio uplift should be in $60K-$90K range, got ${uplift}`);
});

test('defensive guard: taxBenefitPct=undefined treated as 0', () => {
  const withUndefined = compare({ ...defaults, taxBenefitPct: undefined }).houseHack;
  const withZero = compare({ ...defaults, taxBenefitPct: 0 }).houseHack;
  assert.strictEqual(withUndefined.annualTaxBenefit, withZero.annualTaxBenefit,
    'undefined taxBenefitPct should behave same as 0');
});

test('defensive guard: negative taxBenefitPct clamped to 0', () => {
  const withNeg = compare({ ...defaults, taxBenefitPct: -0.5 }).houseHack;
  const withZero = compare({ ...defaults, taxBenefitPct: 0 }).houseHack;
  assert.strictEqual(withNeg.annualTaxBenefit, 0,
    'negative taxBenefitPct should produce annualTaxBenefit=0');
  assert.strictEqual(withNeg.totalWealth, withZero.totalWealth,
    'negative taxBenefitPct should not reduce totalWealth below taxBenefitPct=0');
});

// ── SECTION 10: EMERGENCY FUND (VACANCY MONTHS) ─────────────────────────────

console.log('\n─── 10. Emergency fund (vacancy months) ───');

test('emergencyMonths=0 sets emergencyFund=0 (Phase 1)', () => {
  const a = calcBuy(mkBuyParams({ emergencyMonths: 0 }));
  assert.strictEqual(a.emergencyFund, 0, `emergencyFund should be 0 when emergencyMonths=0`);
});

test('emergencyFund scales upward with emergencyMonths (Phase 1)', () => {
  const a1 = calcBuy(mkBuyParams({ emergencyMonths: 1 }));
  const a3 = calcBuy(mkBuyParams({ emergencyMonths: 3 }));
  assert.ok(a3.emergencyFund > a1.emergencyFund,
    `emergencyFund should increase with months: 1mo=${a1.emergencyFund}, 3mo=${a3.emergencyFund}`);
  near(a3.emergencyFund / 3, a1.emergencyFund, 2,
    'Phase 1 emergency fund should scale linearly by months ');
});

test('emergencyFund assumes complete vacancy (rent level does not change reserve)', () => {
  const noRent = calcBuy(mkBuyParams({ emergencyMonths: 1, rA: 0 }));
  const highRent = calcBuy(mkBuyParams({ emergencyMonths: 1, rA: 2500 }));
  assert.strictEqual(noRent.emergencyFund, highRent.emergencyFund,
    `emergencyFund should ignore rent during vacancy: noRent=${noRent.emergencyFund}, highRent=${highRent.emergencyFund}`);
});

test('emergencyFund includes utilities cost', () => {
  const lowUtils = calcBuy(mkBuyParams({ emergencyMonths: 1, utilities: 200 }));
  const highUtils = calcBuy(mkBuyParams({ emergencyMonths: 1, utilities: 900 }));
  assert.ok(highUtils.emergencyFund > lowUtils.emergencyFund,
    `emergencyFund should increase with utilities: low=${lowUtils.emergencyFund}, high=${highUtils.emergencyFund}`);
});

test('Phase 2 emergency fund is based on Phase 2 carrying costs, not living spend/inflation', () => {
  const base = { phase2Mode: 'buy', years: 10, hackYears: 5, emergencyMonths: 1 };
  const lowInflHighLiving = calcBuy(mkBuyParams({ ...base, inflationRate: 0, weeklyCost: 200 }));
  const highInflLowLiving = calcBuy(mkBuyParams({ ...base, inflationRate: 6, weeklyCost: 50 }));
  assert.strictEqual(lowInflHighLiving.p2EmergencyFund, highInflLowLiving.p2EmergencyFund,
    `p2EmergencyFund should ignore living/inflation inputs: a=${lowInflHighLiving.p2EmergencyFund}, b=${highInflLowLiving.p2EmergencyFund}`);
});

// ── SECTION 11: STATIC UI/CLI FORMULA PARITY ────────────────────────────────

console.log('\n─── 11. Static UI/CLI formula parity ───');

test('Phase 1 emergency-fund equations match between App.jsx and engine.cjs', () => {
  assertMatchingFormula(
    appSource,
    engineSource,
    `
      const vacancyCarryMonthly = totalPITI + initialPMI + hoa + utilities;
      const emergencyFund = Math.round(Math.max(0, vacancyCarryMonthly * emergencyMonths));
      const leftoverCapital = startingCapital - cashToClose - emergencyFund;
    `,
    `
      const vacancyCarryMonthly = totalPITI + initialPMI + hoa + utilities;
      const emergencyFund = Math.round(Math.max(0, vacancyCarryMonthly * efMonths));
      const leftoverCapital = startingCapital - cashToClose - emergencyFund;
    `,
    'Phase 1 emergency fund'
  );
});

test('Phase 2 emergency-fund equations match between App.jsx and engine.cjs', () => {
  assertMatchingFormula(
    appSource,
    engineSource,
    `
      const p2InitialPMI = phase2DownPct < 20 ? (phase2PmiRate / 100) * p2Loan / 12 : 0;
      const p2VacancyCarryMonthly = p2MonthlyPI + p2BaseTax + p2BaseIns + phase2Hoa + p2InitialPMI + phase2Utils;
      p2EmergencyFund = Math.round(Math.max(0, p2VacancyCarryMonthly * emergencyMonths));
      const p2TotalCash = p2Down + p2ClosingCosts + p2EmergencyFund;
    `,
    `
      const p2InitialPMI = phase2DownPct < 20 ? (phase2PmiRate / 100) * p2Loan / 12 : 0;
      const p2VacancyCarryMonthly = p2MonthlyPI + p2BaseTax + p2BaseIns + phase2Hoa + p2InitialPMI + phase2Utils;
      p2EmergencyFund = Math.round(Math.max(0, p2VacancyCarryMonthly * efMonths));
      const p2TotalCash = p2Down + p2ClosingCosts + p2EmergencyFund;
    `,
    'Phase 2 emergency fund'
  );
});

test('Option A portfolio compounding equation matches between App.jsx and engine.cjs', () => {
  assertMatchingFormula(
    appSource,
    engineSource,
    `
      portfolioValue = portfolioValue * (1 + r) + (curSurplus * 12 + annualTaxBenefit) * (1 + r / 2);
    `,
    `
      portfolioValue = portfolioValue * (1 + r) + (curSurplus * 12 + annualTaxBenefit) * (1 + r / 2);
    `,
    'Option A compounding'
  );
});

test('Option B portfolio compounding equation matches between App.jsx and engine.cjs', () => {
  assertMatchingFormula(
    appSource,
    engineSource,
    `
      portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2);
    `,
    `
      portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2);
    `,
    'Option B compounding'
  );
});

test('Final wealth aggregation equations match between App.jsx and engine.cjs', () => {
  assertMatchingFormula(
    appSource,
    engineSource,
    `
      const totalWealth = portfolioValue + netEquityHold + p2FinalNetEquityHold;
      const totalWealthLiq = portfolioValue + netEquityLiq + p2FinalNetEquityLiq;
    `,
    `
      const totalWealth = portfolioValue + netEquityHold + p2FinalNetEquityHold;
      const totalWealthLiq = portfolioValue + netEquityLiq + p2FinalNetEquityLiq;
    `,
    'Final wealth aggregation'
  );
});

// ── SUMMARY ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
console.log(`  ${passed} passed  /  ${failed} failed  /  ${passed + failed} total`);
if (failed > 0) {
  console.log('\n  Re-run after fixing the failures above.\n');
  process.exit(1);
}
console.log('  All tests pass.\n');
