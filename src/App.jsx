import { useState, useMemo } from "react";
import { Slider } from "./components/Slider";
import { Row3 } from "./components/Row3";
import { pmt, calcRequiredMonthlyRent, fmt } from "./utils/math";
import { COLORS, BGS } from "./utils/constants";

/*═══════════════════════════════════════════════════════════════
  HOUSE-HACK SHOWDOWN v5
  House-Hack vs. Never Buy (S&P 500)
  Based on user's corrected calc engine with inflation,
  vacancy, selling costs, starting capital, and leftover invest.
═══════════════════════════════════════════════════════════════*/

export default function App() {
  // ── PERSONAL FINANCE ──
  const [startingCapital, setStartingCapital] = useState(50000);
  const [takeHome, setTakeHome] = useState(2600);
  const [weeklyCost, setWeeklyCost] = useState(75);

  // ── MORTGAGE TERMS ──
  const [downPct, setDownPct] = useState(3);
  const [rate, setRate] = useState(5.875);
  const [taxPct, setTaxPct] = useState(1.21);
  const [insPct, setInsPct] = useState(0.5);
  const [pmiRate, setPmiRate] = useState(0.5);
  const [buyClosingCostPct, setBuyClosingCostPct] = useState(3);

  // ── PROPERTY COSTS ──
  const [utilities, setUtilities] = useState(500);
  const [hoa, setHoa] = useState(0);
  const [maintVacancyPct, setMaintVacancyPct] = useState(5);
  const [emergencyMonths, setEmergencyMonths] = useState(1);
  const [sellingCostPct, setSellingCostPct] = useState(5);

  // ── MARKET & TIMING ──
  const [inflationRate, setInflationRate] = useState(3.0);
  const [investRet, setInvestRet] = useState(10);
  const [hackYears, setHackYears] = useState(2);
  const [years, setYears] = useState(10);
  const [tenantPaysUtils, setTenantPaysUtils] = useState(true);

  // ── A: HOUSE-HACK ──
  const [pA, setPa] = useState(300000);
  const [rA, setRa] = useState(1000);
  const [fullRentA, setFullRentA] = useState(2400);
  const [repA, setRepA] = useState(0);
  const [appA, setAppA] = useState(3.0);
  const [rgA, setRgA] = useState(2);
  const [taxBenefitPctA, setTaxBenefitPctA] = useState(0);

  // ── PHASE 2 PERSONAL HOUSING ──
  const [phase2Mode, setPhase2Mode] = useState("rent"); // "rent" | "buy"
  const [phase2Rent, setPhase2Rent] = useState(1000);
  const [phase2RentGrowth, setPhase2RentGrowth] = useState(3);
  const [phase2Utils, setPhase2Utils] = useState(300);
  const [phase2RenterIns, setPhase2RenterIns] = useState(15);
  // Phase 2 Buy
  const [phase2Price, setPhase2Price] = useState(350000);
  const [phase2DownPct, setPhase2DownPct] = useState(5);
  const [phase2MortRate, setPhase2MortRate] = useState(5.875);
  const [phase2PmiRate, setPhase2PmiRate] = useState(0.5);
  const [phase2App, setPhase2App] = useState(3);
  const [phase2TaxPct, setPhase2TaxPct] = useState(1.21);
  const [phase2InsPct, setPhase2InsPct] = useState(0.5);
  const [phase2Hoa, setPhase2Hoa] = useState(0);

  // ── B: NEVER BUY ──
  const [monthlyRent, setMonthlyRent] = useState(1000);
  const [rentInflation, setRentInflation] = useState(3);
  const [renterIns, setRenterIns] = useState(15);
  const [renterUtils, setRenterUtils] = useState(300);

  const livingMonthly = weeklyCost * 52 / 12;
  const monthlyIncome = takeHome * 2;
  const r = investRet / 100;

  // ── HOUSE-HACK CALC ──
  const calcBuy = (price, rent, fullRent, repairs, appRate, rentGrowth) => {
    const down = Math.round(price * downPct / 100);
    const loan = price - down;
    const monthlyPI = pmt(rate / 100, 30, loan);
    const monthlyTax = Math.round(price * taxPct / 100 / 12);
    const monthlyIns = Math.round(price * insPct / 100 / 12);
    const totalPITI = monthlyPI + monthlyTax + monthlyIns;

    const buyClosingCosts = Math.round(price * (buyClosingCostPct / 100));
    const cashToClose = down + repairs + buyClosingCosts;

    // Phase 1 (house-hack) year 1 snapshot
    const effectiveRentYear1 = rent * (1 - maintVacancyPct / 100);
    const initialPMI = downPct < 20 ? (pmiRate / 100) * loan / 12 : 0;
    const netHousing = totalPITI + initialPMI + hoa - effectiveRentYear1 + utilities;
    const totalExpenses = netHousing + livingMonthly;
    const vacancyCarryMonthly = totalPITI + initialPMI + hoa + utilities;
    const emergencyFund = Math.round(Math.max(0, vacancyCarryMonthly * emergencyMonths));
    const leftoverCapital = startingCapital - cashToClose - emergencyFund;
    const surplus = monthlyIncome - totalExpenses;
    const housingPctGross = netHousing / monthlyIncome * 100;

    let portfolioValue = leftoverCapital > 0 ? leftoverCapital : 0;
    let totalRentCollected = 0;
    const monthlyR = rate / 100 / 12;
    let balance = loan;
    // Depreciation tax benefit: fixed annual cash flow based on purchase price.
    // Applied to all years including the hack phase (intentional simplification —
    // prorating by owner-occupancy fraction adds complexity for a small effect:
    // ~$3K overstatement per hack year at 1.0% on $300K, compounding to ~$3-4K
    // over 10 years, within the model's existing approximation envelope).
    const annualTaxBenefit = price * (taxBenefitPctA / 100);

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
        p2Loan = phase2Price - p2Down;
        p2MonthlyPI = pmt(phase2MortRate / 100, 30, p2Loan);
        p2BaseTax = Math.round(phase2Price * phase2TaxPct / 100 / 12);
        p2BaseIns = Math.round(phase2Price * phase2InsPct / 100 / 12);
        p2Balance = p2Loan;
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
      if (!inHackPhase && phase2Mode === 'buy' && y === hackYears + 1) {
        const p2InitialPMI = phase2DownPct < 20 ? (phase2PmiRate / 100) * p2Loan / 12 : 0;
        const p2VacancyCarryMonthly = p2MonthlyPI + p2BaseTax + p2BaseIns + phase2Hoa + p2InitialPMI + phase2Utils;
        p2EmergencyFund = Math.round(Math.max(0, p2VacancyCarryMonthly * emergencyMonths));
        const p2TotalCash = p2Down + p2ClosingCosts + p2EmergencyFund;
        p2Underfunded = portfolioValue < p2TotalCash;
        portfolioValue -= p2TotalCash;
      }
      const curSurplus = curTakeHome - (curNet + curLiving);
      // Mid-year approximation: existing balance gets full-year return,
      // new contributions get half-year return on average.
      // annualTaxBenefit is added here (after curSurplus is computed) so it does not
      // affect the surplus display row and remains separable for debugging.
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
  };

  // ── NEVER-BUY CALC ──
  const calcNeverBuy = () => {
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
      homeValue: 0, totalRentCollected: 0, totalRentPaid: Math.round(totalRentPaid),
      balance: 0,
      yearlyData,
      p2HomeValue: 0, p2NetEquity: 0, p2Balance: 0, p2SellingCost: 0, p2Down: 0, p2ClosingCosts: 0, p2EmergencyFund: 0, p2CashToClose: 0,
      p2Underfunded: false,
    };
  };

  const deps = [takeHome, weeklyCost, utilities, hoa, startingCapital, downPct, buyClosingCostPct, rate, taxPct, insPct, investRet, inflationRate, years, maintVacancyPct, sellingCostPct, emergencyMonths, hackYears, tenantPaysUtils, phase2Rent, phase2RentGrowth, phase2Utils, phase2RenterIns, phase2Mode, phase2Price, phase2DownPct, phase2MortRate, phase2PmiRate, phase2App, phase2TaxPct, phase2InsPct, phase2Hoa, monthlyRent, rentInflation, pmiRate, renterUtils];
  const a = useMemo(() => calcBuy(pA, rA, fullRentA, repA, appA, rgA), [pA, rA, fullRentA, repA, appA, rgA, taxBenefitPctA, ...deps]);
  const b = useMemo(() => calcNeverBuy(), [monthlyRent, rentInflation, renterIns, renterUtils, ...deps]);

  // ── NEVER-BUY WITH CUSTOM RETURN (for binary search) ──
  const calcNeverBuyWealth = (customReturn) => {
    const cr = customReturn / 100;
    let pv = startingCapital;
    for (let y = 1; y <= years; y++) {
      const inflFactor = Math.pow(1 + inflationRate / 100, y - 1);
      const curRent = monthlyRent * Math.pow(1 + rentInflation / 100, y - 1);
      const curTakeHome = monthlyIncome * Math.pow(1.03, y - 1);
      const curLiving = livingMonthly * inflFactor;
      const curRenterIns = renterIns * inflFactor;
      const curRenterUtils = renterUtils * inflFactor;
      const curExpenses = curRent + curRenterIns + curRenterUtils + curLiving;
      const curSurplus = curTakeHome - curExpenses;
      pv = pv * (1 + cr) + curSurplus * 12 * (1 + cr / 2);
    }
    return pv;
  };

  // ── WINNER ──
  const allW = [a.totalWealth, b.totalWealth];
  const maxW = Math.max(...allW);
  const winIdx = allW.indexOf(maxW);
  const winLabel = ["A", "B"][winIdx];
  const winName = ["House-Hack", "Never Buy (S&P)"][winIdx];
  const winColor = [COLORS.A, COLORS.B][winIdx];
  const margin = Math.abs(a.totalWealth - b.totalWealth);
  const loserW = Math.min(...allW);
  const marginPct = loserW > 0 ? (margin / loserW * 100) : 0;
  const marginPerYear = margin / years;

  // Binary search: what S&P return makes the renter match the house-hack?
  const spBreakeven = useMemo(() => {
    if (winIdx === 1) return investRet;
    let lo = 0, hi = 50;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (calcNeverBuyWealth(mid) < maxW) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }, [winIdx, maxW, ...deps]);

  const wHigh = (...vals) => { const m = Math.max(...vals); return vals.indexOf(m); };

  const wLow = (...vals) => {
    const v = vals.map(x => (x === null || x === undefined) ? Infinity : x);
    const m = Math.min(...v);
    return v.indexOf(m);
  };

  const groupLabelStyle = { fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.15)", fontFamily: "var(--mono)", marginBottom: 6, marginTop: 10 };

  return (
    <div style={{ "--mono": "'JetBrains Mono', monospace", "--body": "'Outfit', sans-serif",
      background: "#080b12", minHeight: "100vh", color: "#dce4f0", fontFamily: "var(--body)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d0f1a 50%, #0a1628 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "24px 20px" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: "#fbbf24", fontFamily: "var(--mono)", marginBottom: 5 }}>HOUSE-HACK SHOWDOWN v5</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "#fff" }}>
            House-Hack <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>vs.</span> Never Buy (S&P 500)
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Accounts for inflation, vacancy, PMI, selling costs, and starting capital. Leftover capital invested on day 1.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1150, margin: "0 auto", padding: "18px 20px 48px" }}>

        {/* SHARED ASSUMPTIONS */}
        <div style={{ marginBottom: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.25)", fontFamily: "var(--mono)", marginBottom: 10 }}>SHARED ASSUMPTIONS</div>

          {/* Personal Finance */}
          <div style={groupLabelStyle}>PERSONAL FINANCE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
            <Slider label="Starting Capital" value={startingCapital} onChange={setStartingCapital} min={5000} max={300000} step={1000} color="#fff" tooltip="Your liquid savings on day one. Used to fund the down payment, closing costs, and any upfront repairs. Any leftover amount starts your investment portfolio." />
            <Slider label="Take-Home / Check" value={takeHome} onChange={setTakeHome} min={1500} max={8000} step={50} color="#fff" tooltip="Your net monthly paycheck after taxes and deductions. Monthly surpluses and deficits are calculated relative to this income." />
            <Slider label="Groceries + Gas / Wk" value={weeklyCost} onChange={setWeeklyCost} min={50} max={200} step={5} color="#fff" tooltip="Average weekly spending on food and fuel. Multiplied by 52/12 to get a monthly figure used in both scenarios." />
          </div>

          {/* Mortgage Terms */}
          <div style={groupLabelStyle}>MORTGAGE TERMS (PROPERTY 1)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
            <Slider label="Down Payment %" value={downPct} onChange={setDownPct} min={0} max={20} step={0.5} prefix="" suffix="%" color="#fff" tooltip="Percentage of the home price paid upfront in cash. Below 20% triggers PMI. Higher down payments reduce monthly payments but tie up more capital." />
            <Slider label="Mortgage Rate" value={rate} onChange={setRate} min={4} max={8} step={0.125} prefix="" suffix="%" color="#fff" tooltip="Annual interest rate on a 30-year fixed mortgage. Directly drives the monthly principal + interest payment." />
            <Slider label="Property Tax" value={taxPct} onChange={setTaxPct} min={0.5} max={2} step={0.01} prefix="" suffix="%" color="#fff" tooltip="Annual property tax as a percentage of home value, paid monthly via escrow. Rates vary widely by county — check your local assessor." />
            <Slider label="Home Insurance %" value={insPct} onChange={setInsPct} min={0.2} max={1.5} step={0.05} prefix="" suffix="%" color="#fff" tooltip="Annual homeowners insurance premium as a percentage of home value, paid via escrow. Typically 0.5–1.0% depending on location and coverage." />
            <Slider label="PMI Rate (if <20% down)" value={pmiRate} onChange={setPmiRate} min={0} max={1.5} step={0.05} prefix="" suffix="%" color="#fff" tooltip="Private Mortgage Insurance required when down payment is under 20%. Added to monthly payment and automatically drops once equity reaches 20% of original value." />
            <Slider label="Buy Closing Costs" value={buyClosingCostPct} onChange={setBuyClosingCostPct} min={0} max={6} step={0.1} prefix="" suffix="%" color="#fff" tooltip="Lender fees, title insurance, escrow, and prepaids paid at purchase. Typically 2–5% of the purchase price, paid from starting capital." />
          </div>

          {/* Property Costs */}
          <div style={groupLabelStyle}>PROPERTY COSTS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
            <Slider label="Property Utilities / Mo" value={utilities} onChange={setUtilities} min={150} max={1200} step={25} color="#fff" tooltip="Monthly water, gas, trash, and shared-area utility costs for the property. May be split with your tenant if they pay utilities." />
            <Slider label="HOA / Mo (Property 1)" value={hoa} onChange={setHoa} min={0} max={1200} step={25} color="#fff" tooltip="Monthly homeowners association fee, if applicable. Covers shared amenities and common-area maintenance. Set to $0 if no HOA." />
            <Slider label="Maint. & Vacancy" value={maintVacancyPct} onChange={setMaintVacancyPct} min={0} max={20} step={1} prefix="" suffix="%" color="#fff" tooltip="Percentage of rental income set aside monthly for repairs, maintenance, and vacant months between tenants. A common landlord rule of thumb is 8–12%." />
            <Slider label="Emergency Coverage (Months)" value={emergencyMonths} onChange={setEmergencyMonths} min={0} max={6} step={1} prefix="" suffix=" mo" color="#fff" tooltip="Cash reserve held outside your portfolio for complete vacancy. Calculated as monthly property carrying costs plus utilities, multiplied by this many months (rent assumed $0 during vacancy)." />
            <Slider label="Cost to Sell" value={sellingCostPct} onChange={setSellingCostPct} min={0} max={10} step={0.5} prefix="" suffix="%" color="#fff" tooltip="Agent commissions and closing costs when you eventually sell the property. Deducted from final sale proceeds when calculating terminal wealth." />
          </div>

          {/* Market & Timing */}
          <div style={groupLabelStyle}>MARKET & TIMING</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
            <Slider label="General Inflation" value={inflationRate} onChange={setInflationRate} min={0} max={8} step={0.5} prefix="" suffix="%" color="#fff" tooltip="Annual rate at which prices rise. Used to inflate ongoing costs like utilities and insurance over time. Does not affect income growth, which is hardcoded at 3%/yr." />
            <Slider label="Investment Return" value={investRet} onChange={setInvestRet} min={4} max={12} step={0.5} prefix="" suffix="%" color="#fff" tooltip="Annual return on money invested in the stock market (e.g., an S&P 500 index fund). Applied to portfolio surpluses each year. The S&P 500 has historically averaged ~10% nominal." />
            <Slider label="House-Hack Years" value={hackYears} onChange={setHackYears} min={0} max={10} step={1} prefix="" suffix=" yrs" color="#fff" tooltip="How many years you live in the property and collect partial rent. After this period (Phase 2), you move out and collect full rent or buy a second home." />
            <Slider label="Projection Years" value={years} onChange={setYears} min={5} max={40} step={1} prefix="" suffix=" yrs" color="#fff" tooltip="Total length of the wealth comparison. Both options are compared at this point in time. Longer horizons tend to favor real estate equity; shorter ones may favor liquidity." />
          </div>

          {/* Phase 2 Housing */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.15)", fontFamily: "var(--mono)" }}>PHASE 2 HOUSING (AFTER MOVE-OUT)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: phase2Mode === "rent" ? "#fff" : "rgba(255,255,255,0.25)", fontFamily: "var(--mono)", cursor: "pointer" }}
                  onClick={() => setPhase2Mode("rent")}>Rent</span>
                <div onClick={() => setPhase2Mode(phase2Mode === "rent" ? "buy" : "rent")} style={{
                  width: 36, height: 18, borderRadius: 9, cursor: "pointer",
                  background: phase2Mode === "buy" ? "#22c55e" : "rgba(255,255,255,0.15)",
                  position: "relative", transition: "background 0.2s", flexShrink: 0
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 2, left: phase2Mode === "buy" ? 20 : 2, transition: "left 0.2s"
                  }} />
                </div>
                <span style={{ fontSize: 10, color: phase2Mode === "buy" ? "#22c55e" : "rgba(255,255,255,0.25)", fontFamily: "var(--mono)", cursor: "pointer" }}
                  onClick={() => setPhase2Mode("buy")}>Buy</span>
              </div>
            </div>
            {phase2Mode === "rent" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
                <Slider label="Phase 2 Personal Rent" value={phase2Rent} onChange={setPhase2Rent} min={0} max={3000} step={50} color="#fff" tooltip="The monthly rent you pay for your own housing after moving out of the house-hack property in Phase 2." />
                <Slider label="Phase 2 Rent Growth" value={phase2RentGrowth} onChange={setPhase2RentGrowth} min={0} max={6} step={0.5} prefix="" suffix="%" color="#fff" tooltip="Annual rate at which your personal rent increases during Phase 2." />
                <Slider label="Phase 2 Utilities / Mo" value={phase2Utils} onChange={setPhase2Utils} min={0} max={600} step={25} color="#fff" tooltip="Your personal monthly utility costs at your Phase 2 rental." />
                <Slider label="Phase 2 Renter's Insurance / Mo" value={phase2RenterIns} onChange={setPhase2RenterIns} min={0} max={50} step={5} color="#fff" tooltip="Monthly cost of renter's insurance for your Phase 2 rental. Typically $15–30/mo." />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
                <Slider label="Phase 2 Home Price" value={phase2Price} onChange={setPhase2Price} min={100000} max={750000} step={5000} color="#22c55e" tooltip="Purchase price of the second home you buy after moving out of your house-hack property." />
                <Slider label="Phase 2 Down Payment %" value={phase2DownPct} onChange={setPhase2DownPct} min={0} max={20} step={0.5} prefix="" suffix="%" color="#22c55e" tooltip="Down payment percentage for your Phase 2 home purchase, funded from the portfolio built during Phase 1." />
                <Slider label="Phase 2 Mortgage Rate" value={phase2MortRate} onChange={setPhase2MortRate} min={4} max={8} step={0.125} prefix="" suffix="%" color="#22c55e" tooltip="Interest rate on the 30-year mortgage for your Phase 2 home purchase." />
                <Slider label="Phase 2 PMI Rate (if <20% down)" value={phase2PmiRate} onChange={setPhase2PmiRate} min={0} max={1.5} step={0.05} prefix="" suffix="%" color="#22c55e" tooltip="PMI rate for the Phase 2 home if the down payment is under 20%. Drops automatically once equity reaches 20%." />
                <Slider label="Phase 2 Appreciation" value={phase2App} onChange={setPhase2App} min={0} max={6} step={0.25} prefix="" suffix="%" color="#22c55e" tooltip="Expected annual home price appreciation rate for the Phase 2 property." />
                <Slider label="Phase 2 Property Tax" value={phase2TaxPct} onChange={setPhase2TaxPct} min={0.5} max={2} step={0.01} prefix="" suffix="%" color="#22c55e" tooltip="Annual property tax rate for your Phase 2 home, as a percentage of its value." />
                <Slider label="Phase 2 Home Insurance" value={phase2InsPct} onChange={setPhase2InsPct} min={0.2} max={1.5} step={0.05} prefix="" suffix="%" color="#22c55e" tooltip="Annual homeowners insurance premium for the Phase 2 home, as a percentage of its value." />
                <Slider label="Phase 2 HOA / Mo" value={phase2Hoa} onChange={setPhase2Hoa} min={0} max={1200} step={25} color="#22c55e" tooltip="Monthly HOA fee for your Phase 2 home, if applicable. Set to $0 if none." />
                <Slider label="Phase 2 Utilities / Mo" value={phase2Utils} onChange={setPhase2Utils} min={0} max={600} step={25} color="#22c55e" tooltip="Your personal monthly utility costs for the Phase 2 home you own." />
              </div>
            )}
          </div>

          {/* Toggles & Warnings */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div onClick={() => setTenantPaysUtils(!tenantPaysUtils)} style={{
                width: 36, height: 18, borderRadius: 9, cursor: "pointer",
                background: tenantPaysUtils ? "#22c55e" : "rgba(255,255,255,0.15)",
                position: "relative", transition: "background 0.2s", flexShrink: 0
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 2, left: tenantPaysUtils ? 20 : 2, transition: "left 0.2s"
                }} />
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "var(--mono)" }}>
                Tenant pays utilities after move-out
              </span>
            </div>
            {a.underfunded && (
              <div style={{ fontSize: 10, color: "#ef4444", fontFamily: "var(--mono)", display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)" }}>
                ⚠ Option A: starting capital doesn't cover cash-to-close + emergency fund ({fmt(a.leftoverCapital)} shortfall) — results assume $0 initial portfolio
              </div>
            )}
            {a.p2Underfunded && phase2Mode === 'buy' && (
              <div style={{ fontSize: 10, color: "#ef4444", fontFamily: "var(--mono)", display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)" }}>
                ⚠ Phase 2 buy: portfolio at year {hackYears} can't cover down + closing + reserves ({fmt(a.p2CashToClose)}) — results may be unreliable
              </div>
            )}
          </div>
        </div>

        {/* 2 PANELS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {/* A */}
          <div style={{ background: `linear-gradient(180deg, ${BGS.A}0.04) 0%, ${BGS.A}0.01) 100%)`,
            border: `1px solid ${BGS.A}0.15)`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.A }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: COLORS.A, fontFamily: "var(--mono)" }}>A: HOUSE-HACK</span>
            </div>
            <Slider label="Home Price" value={pA} onChange={setPa} min={100000} max={750000} step={5000} color={COLORS.A} tooltip="Purchase price of the house-hack property. Drives the mortgage payment, property taxes, and insurance." />
            <Slider label="Rental Income / Mo" value={rA} onChange={setRa} min={0} max={4000} step={50} color={COLORS.A} tooltip="Monthly rent collected from your tenant(s) while you live in the property during the house-hack phase." />
            <Slider label="Full Rent / Mo (after move-out)" value={fullRentA} onChange={setFullRentA} min={0} max={5000} step={50} color={COLORS.A} tooltip="Total monthly rent collected from all units once you move out and rent the whole property. Should be equal to or higher than the house-hack rent." />
            <Slider label="Upfront Repairs" value={repA} onChange={setRepA} min={0} max={50000} step={1000} color={COLORS.A} tooltip="One-time renovation or repair costs paid at purchase, drawn from starting capital before calculating your initial portfolio." />
            <Slider label="Appreciation" value={appA} onChange={setAppA} min={0} max={6} step={0.25} prefix="" suffix="%" color={COLORS.A} tooltip="Expected annual home price growth for this property. Increases equity and terminal sale value." />
            <Slider label="Rent Growth" value={rgA} onChange={setRgA} min={0} max={5} step={0.5} prefix="" suffix="%" color={COLORS.A} tooltip="Annual rate at which rental income grows over the projection period, reflecting lease renewals and market increases." />
            <Slider label="Tax Benefit (Depreciation)" value={taxBenefitPctA} onChange={setTaxBenefitPctA} min={0} max={1.5} step={0.1} prefix="" suffix="% of property value per year (tax savings)" color={COLORS.A} tooltip="Rental properties can deduct annual depreciation (~1/27.5 of the building value, based on original purchase price, not current value) from taxable income, sheltering rental income from taxes. This slider adds the equivalent annual savings to Option A's cash flow. 0% = no tax effect (default). 0.5% ≈ typical landlord in the 22–24% tax bracket. 1.0% ≈ higher bracket or high building-value ratio. Applied to all years as a simplification (no proration for the house-hack phase). Does NOT model: mortgage interest deduction, passive loss rules, depreciation recapture on sale, or state taxes." />
          </div>
          {/* B */}
          <div style={{ background: `linear-gradient(180deg, ${BGS.B}0.04) 0%, ${BGS.B}0.01) 100%)`,
            border: `1px solid ${BGS.B}0.15)`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.B }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: COLORS.B, fontFamily: "var(--mono)" }}>B: NEVER BUY (S&P)</span>
            </div>
            <Slider label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} min={500} max={2500} step={50} color={COLORS.B} tooltip="Starting monthly rent payment in the Never-Buy scenario. Option B invests the down payment in the S&P 500 instead of using it for a home purchase." />
            <Slider label="Rent Inflation / Yr" value={rentInflation} onChange={setRentInflation} min={0} max={6} step={0.5} prefix="" suffix="%" color={COLORS.B} tooltip="Annual rate at which rent increases in Option B. Compounding rent growth is a key long-term cost drag compared to a fixed mortgage payment." />
            <Slider label="Renter's Insurance / Mo" value={renterIns} onChange={setRenterIns} min={10} max={50} step={5} color={COLORS.B} tooltip="Monthly cost of renter's insurance. Covers personal belongings and liability. Typically $15–30/mo." />
            <Slider label="Utilities / Mo" value={renterUtils} onChange={setRenterUtils} min={0} max={1200} step={25} color={COLORS.B} tooltip="Monthly utility costs as a renter. Any monthly surplus after rent, utilities, and insurance is invested in the S&P 500." />
            <div style={{ marginTop: 10, padding: "8px 0", borderTop: `1px solid ${BGS.B}0.1)` }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>All {fmt(startingCapital)} invested in S&P on day 1</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>No property tax, no maintenance, no selling costs</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>Rent inflates at {rentInflation}%/yr (vs fixed mortgage)</div>
            </div>
          </div>
        </div>

        {/* VERDICT */}
        <div style={{ marginBottom: 14, background: `linear-gradient(135deg, ${BGS[winLabel]}0.08) 0%, ${BGS[winLabel]}0.02) 100%)`,
          border: `1px solid ${BGS[winLabel]}0.25)`, borderRadius: 10, padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontFamily: "var(--mono)", marginBottom: 3 }}>
              {years}-YEAR VERDICT (HOLD NET WORTH)
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              Option {winLabel}: {winName} <span style={{ color: winColor }}>wins by {fmt(margin)}</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
              {winIdx === 1
                ? `The S&P outpaces the house-hack. Rental income doesn't overcome mortgage overhead + selling costs at these assumptions.`
                : `The house-hack wins through leverage, rental income, and appreciation. S&P-only trails by ${fmt(margin)}.`}
              {` House-hack: ${fmt(a.totalWealth)} vs. S&P: ${fmt(b.totalWealth)}.`}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "var(--mono)", marginBottom: 4 }}>TOTAL WEALTH</div>
            {["A", "B"].map((l, i) => (
              <div key={l} style={{ fontFamily: "var(--mono)", fontSize: 11, color: i === winIdx ? [COLORS.A, COLORS.B][i] : "rgba(255,255,255,0.3)" }}>
                {l}: {fmt(allW[i])}
              </div>
            ))}
          </div>
        </div>

        {/* WORTH IT? */}
        {(() => {
          const hackW = years > 0 ? hackYears / years : 0;
          const invW = 1 - hackW;
          const t = {
            tossup: 3 * hackW + 10 * invW,
            leaning: 10 * hackW + 20 * invW,
            clear: 20 * hackW + 25 * invW,
          };
          const verdictLabel = marginPct < t.tossup ? "Toss-Up"
            : marginPct < t.leaning ? "Leaning"
            : marginPct < t.clear ? "Clear Win" : "No-Brainer";
          const verdictColor = marginPct < t.tossup ? "#ef4444"
            : marginPct < t.leaning ? "#fbbf24" : "#22c55e";
          const verdictDesc = marginPct < t.tossup
            ? `< ${t.tossup.toFixed(1)}% edge — too close to call, pick what fits your life`
            : marginPct < t.leaning
            ? `${t.tossup.toFixed(1)}–${t.leaning.toFixed(1)}% edge — winner has a real advantage, but it's not overwhelming`
            : marginPct < t.clear
            ? `${t.leaning.toFixed(1)}–${t.clear.toFixed(1)}% edge — strong case for the winner`
            : `> ${t.clear.toFixed(1)}% edge — the math is loud and clear`;
          const cautionThreshold = t.leaning;
          return (
            <div style={{ marginBottom: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#fbbf24", fontFamily: "var(--mono)" }}>IS THE JUICE WORTH THE SQUEEZE?</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "var(--mono)" }}>
                  {hackYears >= years ? "HOUSE-HACK" : hackYears === 0 ? "PURE INVESTMENT" : `HYBRID (${hackYears}yr hack / ${years - hackYears}yr rental)`}
                  {" · "}THRESHOLDS: {t.tossup.toFixed(1)}% / {t.leaning.toFixed(1)}% / {t.clear.toFixed(1)}%
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "var(--mono)", marginBottom: 4 }}>EDGE OVER RUNNER-UP</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: winColor }}>{marginPct.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{fmt(margin)} total</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "var(--mono)", marginBottom: 4 }}>ADVANTAGE PER YEAR</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: winColor }}>{fmt(Math.round(marginPerYear))}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{fmt(Math.round(marginPerYear / 12))}/mo</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "var(--mono)", marginBottom: 4 }}>VERDICT</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: verdictColor }}>{verdictLabel}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{verdictDesc}</div>
                </div>
              </div>
              {winIdx === 0 && marginPct < cautionThreshold && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                  At {fmt(Math.round(marginPerYear))}/yr advantage, ask yourself: is the {hackYears >= years ? "landlord work, shared living, " : hackYears === 0 ? "landlord work, property management, " : "landlord work, shared living then property management, "}and illiquidity worth it vs. just investing in index funds?
                </div>
              )}
              {winIdx === 1 && marginPct < cautionThreshold && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                  The S&P barely edges out buying. A slightly better deal, lower rate, or higher rent could flip this — {hackYears >= years ? "the house-hack" : hackYears === 0 ? "the investment property" : "the hybrid strategy"} is still in play.
                </div>
              )}
            </div>
          );
        })()}

        {/* CHARTS */}
        {(() => {
          const pad = { top: 20, right: 15, bottom: 28, left: 55 };
          const W = 500, H = 220;
          const pW = W - pad.left - pad.right, pH = H - pad.top - pad.bottom;
          const fmtK = v => { if (Math.abs(v) >= 1e6) return `$${(v/1e6).toFixed(1)}M`; if (Math.abs(v) >= 1e3) return `$${Math.round(v/1e3)}k`; return `$${Math.round(v)}`; };

          // Chart 1: Wealth Race
          const allPts = [...a.yearlyData.map(d => d.totalWealth), ...b.yearlyData.map(d => d.totalWealth)];
          const yMin1 = Math.min(0, ...allPts);
          const yMax1 = Math.max(...allPts) * 1.08;
          const xS = y => pad.left + (y / years) * pW;
          const yS1 = v => pad.top + pH - ((v - yMin1) / (yMax1 - yMin1)) * pH;
          const mkLine = (data, key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xS(d.year).toFixed(1)},${yS1(d[key]).toFixed(1)}`).join(' ');
          const lineA1 = mkLine(a.yearlyData, 'totalWealth');
          const lineB1 = mkLine(b.yearlyData, 'totalWealth');

          // Y-axis ticks for chart 1
          const nTicks = 5;
          const tickStep1 = (yMax1 - yMin1) / nTicks;
          const ticks1 = Array.from({ length: nTicks + 1 }, (_, i) => yMin1 + i * tickStep1);

          // Chart 2: House-Hack Breakdown (stacked: net equity bottom, portfolio top)
          const allPts2 = a.yearlyData.map(d => d.portfolioValue + d.netEquity);
          const yMin2 = Math.min(0, ...a.yearlyData.map(d => d.netEquity));
          const yMax2 = Math.max(...allPts2) * 1.08;
          const yS2 = v => pad.top + pH - ((v - yMin2) / (yMax2 - yMin2)) * pH;
          const tickStep2 = (yMax2 - yMin2) / nTicks;
          const ticks2 = Array.from({ length: nTicks + 1 }, (_, i) => yMin2 + i * tickStep2);

          const eqArea = a.yearlyData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xS(d.year).toFixed(1)},${yS2(d.netEquity).toFixed(1)}`).join(' ')
            + ` L${xS(years).toFixed(1)},${yS2(0).toFixed(1)} L${xS(0).toFixed(1)},${yS2(0).toFixed(1)} Z`;
          const portArea = a.yearlyData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xS(d.year).toFixed(1)},${yS2(d.netEquity + d.portfolioValue).toFixed(1)}`).join(' ')
            + a.yearlyData.slice().reverse().map(d => ` L${xS(d.year).toFixed(1)},${yS2(d.netEquity).toFixed(1)}`).join('')
            + ' Z';
          const totalLine2 = a.yearlyData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xS(d.year).toFixed(1)},${yS2(d.netEquity + d.portfolioValue).toFixed(1)}`).join(' ');
          const eqLine2 = a.yearlyData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xS(d.year).toFixed(1)},${yS2(d.netEquity).toFixed(1)}`).join(' ');

          // X-axis ticks (shared)
          const xTicks = [];
          const xStep = years <= 10 ? 1 : years <= 20 ? 2 : 5;
          for (let i = 0; i <= years; i += xStep) xTicks.push(i);
          if (xTicks[xTicks.length - 1] !== years) xTicks.push(years);

          const gridStyle = { stroke: "rgba(255,255,255,0.06)", strokeWidth: 0.5 };
          const axisLabelStyle = { fill: "rgba(255,255,255,0.25)", fontSize: 8, fontFamily: "var(--mono)" };

          const renderGrid = (yScale, ticks) => (
            <>
              {ticks.map((t, i) => <line key={`h${i}`} x1={pad.left} x2={W - pad.right} y1={yScale(t)} y2={yScale(t)} {...gridStyle} />)}
              {xTicks.map((t, i) => <line key={`v${i}`} x1={xS(t)} x2={xS(t)} y1={pad.top} y2={H - pad.bottom} {...gridStyle} />)}
              {ticks.map((t, i) => <text key={`yl${i}`} x={pad.left - 5} y={yScale(t) + 3} textAnchor="end" {...axisLabelStyle}>{fmtK(t)}</text>)}
              {xTicks.map((t, i) => <text key={`xl${i}`} x={xS(t)} y={H - pad.bottom + 14} textAnchor="middle" {...axisLabelStyle}>{t}</text>)}
              <line x1={pad.left} x2={W - pad.right} y1={yScale(0)} y2={yScale(0)} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
            </>
          );

          // Crossover year (for chart 1)
          let crossYear = null;
          for (let i = 1; i < a.yearlyData.length; i++) {
            const aW = a.yearlyData[i].totalWealth, bW = b.yearlyData[i].totalWealth;
            const aPrev = a.yearlyData[i-1].totalWealth, bPrev = b.yearlyData[i-1].totalWealth;
            if ((aW - bW) * (aPrev - bPrev) < 0) {
              const t = (aPrev - bPrev) / ((aPrev - bPrev) - (aW - bW));
              crossYear = a.yearlyData[i-1].year + t;
              break;
            }
          }

          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {/* Wealth Race */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#fbbf24", fontFamily: "var(--mono)" }}>TOTAL WEALTH OVER TIME</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 2, background: COLORS.A, borderRadius: 1 }} />
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "var(--mono)" }}>House-Hack</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 2, background: COLORS.B, borderRadius: 1 }} />
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "var(--mono)" }}>S&P</span>
                    </div>
                  </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
                  {renderGrid(yS1, ticks1)}
                  <path d={lineA1} fill="none" stroke={COLORS.A} strokeWidth={2} />
                  <path d={lineB1} fill="none" stroke={COLORS.B} strokeWidth={2} />
                  {crossYear !== null && (
                    <g>
                      <line x1={xS(crossYear)} x2={xS(crossYear)} y1={pad.top} y2={H - pad.bottom} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} strokeDasharray="3,3" />
                      <text x={xS(crossYear)} y={pad.top - 5} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="var(--mono)">yr {crossYear.toFixed(1)}</text>
                    </g>
                  )}
                  {/* End markers */}
                  <circle cx={xS(years)} cy={yS1(a.yearlyData[years].totalWealth)} r={3} fill={COLORS.A} />
                  <circle cx={xS(years)} cy={yS1(b.yearlyData[years].totalWealth)} r={3} fill={COLORS.B} />
                </svg>
                {crossYear !== null && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "var(--mono)", marginTop: 4 }}>
                    Crossover at year {crossYear.toFixed(1)} — {crossYear < years / 2 ? "house-hack pulls ahead early" : "house-hack takes time to overcome upfront costs"}
                  </div>
                )}
              </div>

              {/* House-Hack Anatomy */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#fbbf24", fontFamily: "var(--mono)" }}>HOUSE-HACK BREAKDOWN</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 6, background: `${BGS.A}0.3)`, border: `1px solid ${COLORS.A}`, borderRadius: 1 }} />
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "var(--mono)" }}>Net Equity</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 6, background: "rgba(96,165,250,0.3)", border: "1px solid #60a5fa", borderRadius: 1 }} />
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "var(--mono)" }}>Portfolio</span>
                    </div>
                  </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
                  {renderGrid(yS2, ticks2)}
                  <path d={portArea} fill="rgba(96,165,250,0.12)" />
                  <path d={eqArea} fill={`${BGS.A}0.15)`} />
                  <path d={eqLine2} fill="none" stroke={COLORS.A} strokeWidth={1.5} />
                  <path d={totalLine2} fill="none" stroke="#60a5fa" strokeWidth={1.5} />
                  {/* End labels */}
                  <circle cx={xS(years)} cy={yS2(a.yearlyData[years].netEquity)} r={3} fill={COLORS.A} />
                  <circle cx={xS(years)} cy={yS2(a.yearlyData[years].netEquity + a.yearlyData[years].portfolioValue)} r={3} fill="#60a5fa" />
                </svg>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "var(--mono)", marginTop: 4 }}>
                  Year {years}: {fmtK(a.netEquity)} equity + {fmtK(a.portfolioValue)} portfolio = {fmtK(a.totalWealth)} total
                </div>
              </div>
            </div>
          );
        })()}

        {/* TABLE */}
        <div style={{ background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.2)", fontFamily: "var(--mono)" }}>METRIC</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: COLORS.A, fontFamily: "var(--mono)", textAlign: "center" }}>A: {fmt(pA)}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: COLORS.B, fontFamily: "var(--mono)", textAlign: "center" }}>B: RENT+S&P</div>
          </div>

          <Row3 label="UPFRONT CAPITAL ALLOCATION" section />
          <Row3 label="Cash to Close" vals={[a.cashToClose, 0]} winIdx={wLow(a.cashToClose, 0)} />
          <Row3 label="Buy Closing Costs" vals={[a.buyClosingCosts, 0]} winIdx={wLow(a.buyClosingCosts, 0)} />
          <Row3 label="Emergency Fund (set aside)" vals={[a.emergencyFund, 0]} winIdx={wLow(a.emergencyFund, 0)} />
          <Row3 label="Leftover Capital → Invested Day 1" vals={[a.leftoverCapital, startingCapital]} winIdx={wHigh(a.leftoverCapital, startingCapital)} highlight />

          <Row3 label="MONTHLY PICTURE (YEAR 1)" section />
          <Row3 label="Mortgage PITI" vals={[a.totalPITI, null]} />
          <Row3 label="HOA Fees" vals={[a.hoaYear1, 0]} />
          <Row3 label="Rent Paid" vals={[null, monthlyRent]} />
          <Row3 label="Effective Rental Income" vals={[a.effectiveRentYear1, null]} />
          <Row3 label="Housing % of Take-Home" vals={[a.housingPctGross, b.housingPctGross]}
            fmtFn={v => v.toFixed(1) + "%"} winIdx={wLow(a.housingPctGross, b.housingPctGross)} highlight />
          <Row3 label="Net Housing Cost" vals={[a.netHousing, b.netHousing]} winIdx={wLow(a.netHousing, b.netHousing)} highlight />
          <Row3 label="Total Monthly Expenses" vals={[a.totalExpenses, b.totalExpenses]} winIdx={wLow(a.totalExpenses, b.totalExpenses)} />
          <Row3 label="Monthly Surplus → Invest" vals={[a.surplus, b.surplus]} winIdx={wHigh(a.surplus, b.surplus)} highlight />
          <Row3 label="Surplus / Check" vals={[a.surplusChk, b.surplusChk]} winIdx={wHigh(a.surplusChk, b.surplusChk)} />

          <Row3 label={`${years}-YEAR OUTCOME`} section />
          <Row3 label="Home Value (Property 1)" vals={[a.homeValue, null]} />
          <Row3 label="Remaining Mortgage (Property 1)" vals={[a.balance, null]} />
          <Row3 label="Principal Paid (equity earned)" vals={[a.principalPaid, null]} />
          <Row3 label="Appreciation Gain" vals={[a.appreciationGain, null]} />
          <Row3 label="Hold Equity (Property 1)" vals={[a.grossEquity, 0]} winIdx={wHigh(a.grossEquity, 0)} highlight />
          <Row3 label={`Cost to Sell (${sellingCostPct}%)`} vals={[-a.sellingCost, 0]} winIdx={1} flipColor />
          <Row3 label="Liquidation Equity (Property 1)" vals={[a.netEquityLiq, 0]} winIdx={wHigh(a.netEquityLiq, 0)} />
          {phase2Mode === 'buy' && years > hackYears && (
            <>
              <Row3 label="PHASE 2 PROPERTY" section />
              <Row3 label="Phase 2 Home Value" vals={[a.p2HomeValue, null]} />
              <Row3 label="Phase 2 Remaining Mortgage" vals={[a.p2Balance, null]} />
              <Row3 label="Phase 2 Hold Equity" vals={[a.p2NetEquity, 0]} winIdx={wHigh(a.p2NetEquity, 0)} highlight />
              <Row3 label={`Phase 2 Cost to Sell (${sellingCostPct}%)`} vals={[-a.p2SellingCost, 0]} winIdx={1} flipColor />
              <Row3 label="Phase 2 Liquidation Equity" vals={[a.p2NetEquityLiq, 0]} winIdx={wHigh(a.p2NetEquityLiq, 0)} />
              <Row3 label="Combined Hold Equity" vals={[a.netEquity + a.p2NetEquity, 0]} winIdx={wHigh(a.netEquity + a.p2NetEquity, 0)} highlight />
            </>
          )}
          <Row3 label="Total Rent Collected" vals={[a.totalRentCollected, null]} />
          <Row3 label="Total Rent Paid" vals={[0, b.totalRentPaid]} fmtFn={v => v === 0 ? "$0" : fmt(-v)} winIdx={0} />
          {a.annualTaxBenefit > 0 && <Row3 label="Tax Savings (Depreciation) / yr" vals={[a.annualTaxBenefit, 0]} winIdx={wHigh(a.annualTaxBenefit, 0)} />}
          <Row3 label="Investment Portfolio" vals={[a.portfolioValue, b.portfolioValue]} winIdx={wHigh(a.portfolioValue, b.portfolioValue)} highlight />
          <Row3 label="HOLD NET WORTH" vals={[a.totalWealth, b.totalWealth]} winIdx={winIdx} highlight />
          <Row3 label="LIQUIDATION NET WORTH" vals={[a.totalWealthLiq, b.totalWealth]} winIdx={wHigh(a.totalWealthLiq, b.totalWealth)} />
          <Row3 label="ROI" section />
          <Row3 label="Total Gain" vals={[a.totalWealth - startingCapital, b.totalWealth - startingCapital]} winIdx={wHigh(a.totalWealth - startingCapital, b.totalWealth - startingCapital)} />
          <Row3 label="Total ROI %" vals={[a.totalWealth - startingCapital, b.totalWealth - startingCapital]} fmtFn={v => `${(v / startingCapital * 100).toFixed(1)}%`} winIdx={wHigh(a.totalWealth, b.totalWealth)} />
          <Row3 label={`Annualized ROI (${years}yr CAGR)`} vals={[a.totalWealth, b.totalWealth]} fmtFn={v => `${((Math.pow(v / startingCapital, 1 / years) - 1) * 100).toFixed(1)}%`} winIdx={wHigh(a.totalWealth, b.totalWealth)} />
          <Row3 label="Wealth Multiple" vals={[a.totalWealth, b.totalWealth]} fmtFn={v => `${(v / startingCapital).toFixed(2)}x`} winIdx={wHigh(a.totalWealth, b.totalWealth)} highlight />

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", padding: "10px 12px",
            background: `${BGS[winLabel]}0.05)`, borderTop: `2px solid ${BGS[winLabel]}0.2)` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Winner</div>
            {allW.map((v, i) => (
              <div key={i} style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--mono)", textAlign: "center",
                color: i === winIdx ? [COLORS.A, COLORS.B][i] : "rgba(255,255,255,0.2)" }}>
                {i === winIdx ? "★ " : ""}{fmt(v)}
              </div>
            ))}
          </div>
        </div>

        {/* INSIGHTS */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#fbbf24", fontFamily: "var(--mono)", marginBottom: 8 }}>WHY THIS RESULT</div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <strong style={{ color: "#fff" }}>Leverage vs. liquidity.</strong> The house-hacker controls a {fmt(pA)} asset with {fmt(a.cashToClose)} down.
              The renter invests the full {fmt(startingCapital)} at {investRet}% with zero leverage. At {appA}% appreciation, that's {Math.round(pA / Math.max(a.down, 1))}x leverage on the buy side.
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <strong style={{ color: "#fff" }}>The renter's hidden cost: inflation.</strong> Rent inflates at {rentInflation}%/yr. The mortgage is fixed forever.
              Over {years} years, the renter's housing cost rises from {fmt(monthlyRent)} to {fmt(Math.round(monthlyRent * Math.pow(1 + rentInflation / 100, years)))}/mo.
              The homeowner's P&I never changes. That widening gap compounds.
            </div>
            {phase2Mode === 'buy' && years > hackYears && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                <strong style={{ color: "#fff" }}>Phase 2: building equity in a second home.</strong> Instead of renting after moving out, you buy a {fmt(phase2Price)} home.
                The {fmt(a.p2CashToClose)} cash-to-close comes from your portfolio at year {hackYears}, but you build {fmt(a.p2NetEquity)} in equity over {years - hackYears} years
                at {phase2App}% appreciation — turning a housing expense into a wealth-building asset.
              </div>
            )}
            {taxBenefitPctA > 0 && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                <strong style={{ color: "#fff" }}>Tax savings from depreciation.</strong> At {taxBenefitPctA}% of the {fmt(pA)} purchase price, Option A generates {fmt(a.annualTaxBenefit)}/yr in estimated tax savings.
                That cash flow compounds into the investment portfolio each year, contributing to Option A's wealth advantage. This is an approximation — actual savings depend on your tax bracket, building-to-land ratio, and tax situation.
              </div>
            )}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <strong style={{ color: "#fff" }}>Hold vs. liquidation.</strong> The primary comparison uses hold equity (no selling costs) since the strategy is long-term hold.
              If you sold everything, {sellingCostPct}% selling costs would reduce property equity by {fmt(a.sellingCost + a.p2SellingCost)}, bringing net worth to {fmt(a.totalWealthLiq)}.
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <strong style={{ color: "#fff" }}>Stress test:</strong> Set rental income to $0, appreciation to 2%, and investment return to 10%.
              If the S&P wins under those conditions, the house-hack only works because tenants show up. If the house-hack still wins, the leverage math is genuinely strong.
            </div>
          </div>
        </div>

        {/* WHAT FLIPS */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "#fbbf24", fontFamily: "var(--mono)", marginBottom: 8 }}>WHAT FLIPS THE ANSWER?</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            {winIdx === 0 ? (
              <>
                The S&P path would need roughly <strong style={{ color: COLORS.B }}>{spBreakeven.toFixed(1)}% annual returns</strong> to
                match the house-hack at current assumptions. Or rental income would need to drop to <strong style={{ color: COLORS.B }}>{fmt(Math.max(0, Math.round(rA - calcRequiredMonthlyRent(a.totalWealth - b.totalWealth, years, investRet))))}</strong>/mo
                for the market to win. The house-hack's edge is tenants + leverage — erode either and the S&P catches up.
                {taxBenefitPctA > 0 && <> Setting the tax benefit slider to 0% would remove {fmt(a.annualTaxBenefit)}/yr from Option A's compounding, narrowing the gap.</>}
              </>
            ) : (
              <>
                The house-hack would win if rental income exceeds roughly <strong style={{ color: COLORS.A }}>{fmt(Math.round(rA + calcRequiredMonthlyRent(b.totalWealth - a.totalWealth, years, investRet)))}</strong>/mo,
                or if appreciation exceeds <strong style={{ color: COLORS.A }}>{(appA + (b.totalWealth - a.totalWealth) / pA / years * 100).toFixed(1)}%</strong>.
                At current assumptions, the market's {investRet}% compounding on {fmt(startingCapital)} day-1 capital beats leveraged real estate.
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 14, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)",
          fontSize: 7, color: "rgba(255,255,255,0.1)", fontFamily: "var(--mono)", textAlign: "center" }}>
          HOUSE-HACK SHOWDOWN v5 · {hackYears >= years ? "house-hack" : hackYears === 0 ? "investment" : "hybrid"} · phase 2: {phase2Mode} · 3% raise · {inflationRate}% inflation · {maintVacancyPct}% vacancy · {sellingCostPct}% sell cost · {investRet}% S&P · 30yr fixed
        </div>
      </div>
    </div>
  );
}
