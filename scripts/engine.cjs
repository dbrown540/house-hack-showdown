/**
 * House-Hack Showdown v5 — Calculation Engine
 *
 * Pure functions extracted from src/App.jsx for CLI/batch use.
 * No React dependencies. Mirrors the UI calc logic exactly.
 *
 * See SKILLS.md for usage and equations.md for formula documentation.
 */

// ── HELPERS ──

// Keep in sync with src/utils/math.js
function pmt(rate, nper, pv) {
  if (rate === 0) return pv / (nper * 12); // returns monthly payment; nper is in years
  const r = rate / 12;
  const n = nper * 12;
  return pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcRequiredMonthlyRent(gap, years, annualRate) {
  if (gap <= 0) return 0;
  const r = annualRate / 100;
  if (r === 0) return Math.round(gap / years / 12);
  const annualExtra = (gap * r) / (Math.pow(1 + r, years) - 1);
  return Math.round(annualExtra / 12);
}

const fmt = (v) => {
  if (v === 0) return "$0";
  if (v === null || v === undefined) return "—";
  const neg = v < 0;
  const s = Math.abs(Math.round(v)).toLocaleString();
  return (neg ? "-$" : "$") + s;
};

// ── CALC BUY (HOUSE-HACK) ──

function calcBuy(params) {
  const {
    startingCapital, takeHome, weeklyCost,
    downPct, rate, taxPct, insPct, pmiRate, buyClosingCostPct,
    utilities, hoa, maintVacancyPct, emergencyPct, sellingCostPct,
    inflationRate, investRet, hackYears, years, tenantPaysUtils,
    phase2Mode, phase2Utils, phase2Rent, phase2RentGrowth, phase2RenterIns,
    phase2Price, phase2DownPct, phase2MortRate, phase2PmiRate,
    phase2App, phase2TaxPct, phase2InsPct, phase2Hoa,
    // Per-property inputs
    price, rent, fullRent, repairs, appRate, rentGrowth,
    taxBenefitPct = 0,
  } = params;

  const livingMonthly = weeklyCost * 52 / 12;
  const monthlyIncome = takeHome * 2;
  const r = investRet / 100;

  const down = Math.round(price * downPct / 100);
  const loan = price - down;
  const monthlyPI = pmt(rate / 100, 30, loan);
  const monthlyTax = Math.round(price * taxPct / 100 / 12);
  const monthlyIns = Math.round(price * insPct / 100 / 12);
  const totalPITI = monthlyPI + monthlyTax + monthlyIns;

  const buyClosingCosts = Math.round(price * (buyClosingCostPct / 100));
  const emergencyFund = Math.round(price * emergencyPct / 100);
  const cashToClose = down + repairs + buyClosingCosts;
  const leftoverCapital = startingCapital - cashToClose - emergencyFund;

  // Phase 1 (house-hack) year 1 snapshot
  const effectiveRentYear1 = rent * (1 - maintVacancyPct / 100);
  const initialPMI = downPct < 20 ? (pmiRate / 100) * loan / 12 : 0;
  const netHousing = totalPITI + initialPMI + hoa - effectiveRentYear1 + utilities;
  const totalExpenses = netHousing + livingMonthly;
  const surplus = monthlyIncome - totalExpenses;
  const housingPctGross = netHousing / monthlyIncome * 100;

  let portfolioValue = leftoverCapital > 0 ? leftoverCapital : 0;
  let totalRentCollected = 0;
  const monthlyR = rate / 100 / 12;
  let balance = loan;
  // Defensive guard: prevent NaN or negative from direct API callers bypassing slider bounds
  const pct = Math.max(0, taxBenefitPct || 0);
  const annualTaxBenefit = price * pct / 100;

  // Phase 2 buy tracking
  let p2Balance = 0;
  let p2MonthlyPI = 0;
  let p2BaseTax = 0;
  let p2BaseIns = 0;
  let p2Loan = 0;
  let p2Down = 0;
  let p2ClosingCosts = 0;
  let p2EmergencyFund = 0;
  let p2Underfunded = false;

  const yr0HoldEq = down;
  const yr0LiqEq = down - price * (sellingCostPct / 100);
  const yearlyData = [{ year: 0, totalWealth: portfolioValue + yr0HoldEq, totalWealthLiq: portfolioValue + yr0LiqEq, portfolioValue, netEquity: yr0HoldEq, netEquityLiq: yr0LiqEq, principalPaid: 0, appreciationGain: 0 }];

  for (let y = 1; y <= years; y++) {
    // Pay down mortgage for this year (12 months)
    for (let m = 0; m < 12; m++) { balance = balance * (1 + monthlyR) - monthlyPI; }
    balance = Math.max(balance, 0);

    const inHackPhase = y <= hackYears;
    const inflFactor = Math.pow(1 + inflationRate / 100, y - 1);
    const baseRent = inHackPhase ? rent : fullRent;
    const rentGrowthYears = inHackPhase ? (y - 1) : (y - hackYears - 1);
    const curRent = baseRent * Math.pow(1 + rentGrowth / 100, Math.max(0, rentGrowthYears));
    const curEffRent = curRent * (1 - maintVacancyPct / 100);
    totalRentCollected += curEffRent * 12;
    const curTakeHome = monthlyIncome * Math.pow(1.03, y - 1);
    const curUtils = utilities * inflFactor;
    const curHoa = hoa * inflFactor;
    const curLiving = livingMonthly * inflFactor;
    const curTax = monthlyTax * inflFactor;
    const curIns = monthlyIns * inflFactor;
    const curPITI = monthlyPI + curTax + curIns;

    // PMI: applies when balance > 80% of current home value
    const curHomeValue = price * Math.pow(1 + appRate / 100, y);
    const monthlyPMI = (balance > 0.8 * curHomeValue && downPct < 20) ? (pmiRate / 100) * loan / 12 : 0;

    // Phase 2: buy second property at transition year
    if (!inHackPhase && phase2Mode === 'buy' && y === hackYears + 1) {
      p2Down = Math.round(phase2Price * phase2DownPct / 100);
      p2ClosingCosts = Math.round(phase2Price * (buyClosingCostPct / 100));
      p2EmergencyFund = Math.round(phase2Price * emergencyPct / 100);
      p2Loan = phase2Price - p2Down;
      p2MonthlyPI = pmt(phase2MortRate / 100, 30, p2Loan);
      p2BaseTax = Math.round(phase2Price * phase2TaxPct / 100 / 12);
      p2BaseIns = Math.round(phase2Price * phase2InsPct / 100 / 12);
      p2Balance = p2Loan;
      const p2TotalCash = p2Down + p2ClosingCosts + p2EmergencyFund;
      p2Underfunded = portfolioValue < p2TotalCash;
      portfolioValue -= p2TotalCash;
    }

    // Pay down Phase 2 mortgage
    if (!inHackPhase && phase2Mode === 'buy' && p2Balance > 0) {
      const p2MonthlyR = phase2MortRate / 100 / 12;
      for (let m = 0; m < 12; m++) { p2Balance = p2Balance * (1 + p2MonthlyR) - p2MonthlyPI; }
      p2Balance = Math.max(p2Balance, 0);
    }

    // Phase 2 personal housing cost
    let curPersonalHousing = 0;
    const p2YearsOut = y - hackYears - 1;
    const p2InflFactor2 = Math.pow(1 + inflationRate / 100, p2YearsOut);
    const curPersonalUtils = inHackPhase ? 0 : phase2Utils * p2InflFactor2;
    let curPersonalRenterIns = 0;
    if (!inHackPhase) {
      if (phase2Mode === 'rent') {
        curPersonalHousing = phase2Rent * Math.pow(1 + phase2RentGrowth / 100, p2YearsOut);
        curPersonalRenterIns = phase2RenterIns * p2InflFactor2;
      } else {
        // Phase 2 buy: PITI (PI fixed, tax/ins inflate)
        const p2InflFactor = Math.pow(1 + inflationRate / 100, y - hackYears - 1);
        const p2HomeValue = phase2Price * Math.pow(1 + phase2App / 100, y - hackYears);
        const p2MonthlyPMI = (p2Balance > 0.8 * p2HomeValue && phase2DownPct < 20) ? (phase2PmiRate / 100) * p2Loan / 12 : 0;
        curPersonalHousing = p2MonthlyPI + p2BaseTax * p2InflFactor + p2BaseIns * p2InflFactor + phase2Hoa * p2InflFactor + p2MonthlyPMI;
      }
    }

    const ownerUtils = (inHackPhase || !tenantPaysUtils) ? curUtils : 0;
    const curNet = curPITI + monthlyPMI + curHoa - curEffRent + ownerUtils + curPersonalHousing + curPersonalUtils + curPersonalRenterIns;
    const curSurplus = curTakeHome - (curNet + curLiving);
    // annualTaxBenefit added after curSurplus is computed; does not affect surplus display value
    portfolioValue = portfolioValue * (1 + r) + (curSurplus * 12 + annualTaxBenefit) * (1 + r / 2);

    // Phase 2 equity (hold = no selling costs, liq = with selling costs)
    let p2HoldEquity = 0;
    let p2LiqEquity = 0;
    if (!inHackPhase && phase2Mode === 'buy') {
      const p2HomeValue = phase2Price * Math.pow(1 + phase2App / 100, y - hackYears);
      p2HoldEquity = p2HomeValue - p2Balance;
      p2LiqEquity = p2HomeValue - p2Balance - p2HomeValue * (sellingCostPct / 100);
    }

    const curHoldEq = curHomeValue - balance;
    const curLiqEq = curHomeValue - balance - curHomeValue * (sellingCostPct / 100);
    const totalHoldEq = curHoldEq + p2HoldEquity;
    const totalLiqEq = curLiqEq + p2LiqEquity;
    yearlyData.push({ year: y, totalWealth: portfolioValue + totalHoldEq, totalWealthLiq: portfolioValue + totalLiqEq, portfolioValue, netEquity: totalHoldEq, netEquityLiq: totalLiqEq, principalPaid: loan - balance, appreciationGain: curHomeValue - price });
  }

  const homeValue = price * Math.pow(1 + appRate / 100, years);
  const grossEquity = homeValue - balance;
  const sellingCost = homeValue * (sellingCostPct / 100);
  const netEquityLiq = grossEquity - sellingCost;
  const netEquityHold = grossEquity;

  // Phase 2 final values
  let p2FinalHomeValue = 0;
  let p2FinalSellingCost = 0;
  let p2FinalNetEquityLiq = 0;
  let p2FinalNetEquityHold = 0;
  if (phase2Mode === 'buy' && years > hackYears) {
    p2FinalHomeValue = phase2Price * Math.pow(1 + phase2App / 100, years - hackYears);
    p2FinalSellingCost = p2FinalHomeValue * (sellingCostPct / 100);
    p2FinalNetEquityLiq = p2FinalHomeValue - p2Balance - p2FinalSellingCost;
    p2FinalNetEquityHold = p2FinalHomeValue - p2Balance;
  }

  const totalWealth = portfolioValue + netEquityHold + p2FinalNetEquityHold;
  const totalWealthLiq = portfolioValue + netEquityLiq + p2FinalNetEquityLiq;

  const principalPaid = loan - balance;
  const appreciationGain = homeValue - price;
  const underfunded = leftoverCapital < 0;

  return {
    down, loan, buyClosingCosts, emergencyFund, totalPITI: Math.round(totalPITI), cashToClose,
    leftoverCapital: Math.round(leftoverCapital), underfunded,
    effectiveRentYear1: Math.round(effectiveRentYear1),
    netHousing: Math.round(netHousing), totalExpenses: Math.round(totalExpenses),
    hoaYear1: Math.round(hoa),
    surplus: Math.round(surplus), surplusChk: Math.round(surplus / 2),
    housingPctGross,
    portfolioValue: Math.round(portfolioValue),
    grossEquity: Math.round(grossEquity), sellingCost: Math.round(sellingCost),
    netEquity: Math.round(netEquityHold), netEquityLiq: Math.round(netEquityLiq),
    totalWealth: Math.round(totalWealth), totalWealthLiq: Math.round(totalWealthLiq),
    homeValue: Math.round(homeValue), totalRentCollected: Math.round(totalRentCollected),
    balance: Math.round(balance),
    principalPaid: Math.round(principalPaid), appreciationGain: Math.round(appreciationGain),
    annualTaxBenefit: Math.round(annualTaxBenefit),
    yearlyData,
    // Phase 2 buy fields
    p2HomeValue: Math.round(p2FinalHomeValue),
    p2NetEquity: Math.round(p2FinalNetEquityHold),
    p2NetEquityLiq: Math.round(p2FinalNetEquityLiq),
    p2Balance: Math.round(p2Balance),
    p2SellingCost: Math.round(p2FinalSellingCost),
    p2Down, p2ClosingCosts, p2EmergencyFund,
    p2CashToClose: p2Down + p2ClosingCosts + p2EmergencyFund,
    p2Underfunded,
  };
}

// ── CALC NEVER BUY (S&P) ──

function calcNeverBuy(params) {
  const {
    startingCapital, takeHome, weeklyCost,
    inflationRate, investRet, years,
    monthlyRent, rentInflation, renterIns, renterUtils,
  } = params;

  const livingMonthly = weeklyCost * 52 / 12;
  const monthlyIncome = takeHome * 2;
  const r = investRet / 100;

  let portfolioValue = startingCapital;
  let totalRentPaid = 0;

  const year1Expenses = monthlyRent + renterIns + renterUtils + livingMonthly;
  const surplus0 = monthlyIncome - year1Expenses;

  const yearlyData = [{ year: 0, totalWealth: startingCapital, portfolioValue: startingCapital }];

  for (let y = 1; y <= years; y++) {
    const inflFactor = Math.pow(1 + inflationRate / 100, y - 1);
    const curRent = monthlyRent * Math.pow(1 + rentInflation / 100, y - 1);
    totalRentPaid += curRent * 12;
    const curTakeHome = monthlyIncome * Math.pow(1.03, y - 1);
    const curLiving = livingMonthly * inflFactor;
    const curRenterIns = renterIns * inflFactor;
    const curRenterUtils = renterUtils * inflFactor;
    const curExpenses = curRent + curRenterIns + curRenterUtils + curLiving;
    const curSurplus = curTakeHome - curExpenses;
    portfolioValue = portfolioValue * (1 + r) + curSurplus * 12 * (1 + r / 2);
    yearlyData.push({ year: y, totalWealth: portfolioValue, portfolioValue });
  }

  const housingPct = (monthlyRent + renterUtils) / monthlyIncome * 100;

  return {
    down: 0, loan: 0, buyClosingCosts: 0, totalPITI: 0, cashToClose: 0,
    leftoverCapital: startingCapital,
    effectiveRentYear1: 0,
    netHousing: Math.round(monthlyRent + renterIns + renterUtils),
    totalExpenses: Math.round(monthlyRent + renterIns + renterUtils + livingMonthly),
    hoaYear1: 0,
    surplus: Math.round(surplus0), surplusChk: Math.round(surplus0 / 2),
    housingPctGross: housingPct,
    portfolioValue: Math.round(portfolioValue),
    grossEquity: 0, sellingCost: 0, netEquity: 0, netEquityLiq: 0, annualTaxBenefit: 0,
    totalWealth: Math.round(portfolioValue),
    totalWealthLiq: Math.round(portfolioValue),
    homeValue: 0, totalRentCollected: 0, totalRentPaid: Math.round(totalRentPaid),
    balance: 0,
    yearlyData,
    p2HomeValue: 0, p2NetEquity: 0, p2NetEquityLiq: 0, p2Balance: 0, p2SellingCost: 0,
    p2Down: 0, p2ClosingCosts: 0, p2EmergencyFund: 0, p2CashToClose: 0,
    p2Underfunded: false,
  };
}

// ── COMPARE ──

function compare(params) {
  const a = calcBuy({
    ...params,
    price: params.pA,
    rent: params.rA,
    fullRent: params.fullRentA,
    repairs: params.repA,
    appRate: params.appA,
    rentGrowth: params.rgA,
  });
  const b = calcNeverBuy(params);

  const allW = [a.totalWealth, b.totalWealth];
  const maxW = Math.max(...allW);
  const winIdx = allW.indexOf(maxW);
  const margin = Math.abs(a.totalWealth - b.totalWealth);
  const loserW = Math.min(...allW);
  const marginPct = loserW > 0 ? (margin / loserW * 100) : 0;
  const marginPerYear = margin / params.years;

  // S&P breakeven return (binary search)
  let spBreakeven = params.investRet;
  if (winIdx === 0) {
    let lo = 0, hi = 50;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const cr = mid / 100;
      let pv = params.startingCapital;
      const livingMonthly = params.weeklyCost * 52 / 12;
      const monthlyIncome = params.takeHome * 2;
      for (let y = 1; y <= params.years; y++) {
        const inflFactor = Math.pow(1 + params.inflationRate / 100, y - 1);
        const curRent = params.monthlyRent * Math.pow(1 + params.rentInflation / 100, y - 1);
        const curTakeHome = monthlyIncome * Math.pow(1.03, y - 1);
        const curLiving = livingMonthly * inflFactor;
        const curRenterIns = params.renterIns * inflFactor;
        const curRenterUtils = params.renterUtils * inflFactor;
        const curExpenses = curRent + curRenterIns + curRenterUtils + curLiving;
        const curSurplus = curTakeHome - curExpenses;
        pv = pv * (1 + cr) + curSurplus * 12 * (1 + cr / 2);
      }
      if (pv < maxW) lo = mid; else hi = mid;
    }
    spBreakeven = (lo + hi) / 2;
  }

  // ROI stats helper
  function roiStats(finalWealth, initial, years) {
    const totalGain = finalWealth - initial;
    const totalROI = initial > 0 ? (totalGain / initial * 100) : 0;
    const cagr = initial > 0 ? ((Math.pow(finalWealth / initial, 1 / years) - 1) * 100) : 0;
    const wealthMultiple = initial > 0 ? finalWealth / initial : 0;
    return {
      totalGain: Math.round(totalGain),
      totalROI: Math.round(totalROI * 10) / 10,
      annualizedROI: Math.round(cagr * 10) / 10,
      wealthMultiple: Math.round(wealthMultiple * 100) / 100,
    };
  }

  const sc = params.startingCapital;

  return {
    winner: winIdx === 0 ? "House-Hack" : "Never Buy (S&P)",
    winnerLabel: winIdx === 0 ? "A" : "B",
    margin: Math.round(margin),
    marginPct: Math.round(marginPct * 10) / 10,
    marginPerYear: Math.round(marginPerYear),
    spBreakeven: Math.round(spBreakeven * 10) / 10,
    houseHack: {
      totalWealth: a.totalWealth,
      totalWealthLiq: a.totalWealthLiq,
      portfolioValue: a.portfolioValue,
      netEquity: a.netEquity,
      netEquityLiq: a.netEquityLiq,
      homeValue: a.homeValue,
      balance: a.balance,
      surplus: a.surplus,
      cashToClose: a.cashToClose,
      leftoverCapital: a.leftoverCapital,
      underfunded: a.underfunded,
      totalRentCollected: a.totalRentCollected,
      annualTaxBenefit: a.annualTaxBenefit,
      p2NetEquity: a.p2NetEquity,
      p2Underfunded: a.p2Underfunded,
      yearlyData: a.yearlyData,
      roi: roiStats(a.totalWealth, sc, params.years),
      roiLiq: roiStats(a.totalWealthLiq, sc, params.years),
    },
    neverBuy: {
      totalWealth: b.totalWealth,
      portfolioValue: b.portfolioValue,
      surplus: b.surplus,
      totalRentPaid: b.totalRentPaid,
      yearlyData: b.yearlyData,
      roi: roiStats(b.totalWealth, sc, params.years),
    },
  };
}

module.exports = { pmt, calcRequiredMonthlyRent, fmt, calcBuy, calcNeverBuy, compare };
