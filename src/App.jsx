import { useState, useMemo } from "react";
import { Slider } from "./components/Slider";
import { Row3 } from "./components/Row3";
import { pmt, calcRequiredMonthlyRent, fmt } from "./utils/math";
import { COLORS, BGS } from "./utils/constants";

/*═══════════════════════════════════════════════════════════════
  HOUSE-HACK SHOWDOWN v3.1
  Buy Cheap vs. Buy Better vs. Never Buy (S&P 500)
  Based on user's corrected calc engine with inflation,
  vacancy, selling costs, starting capital, and leftover invest.
═══════════════════════════════════════════════════════════════*/

export default function App() {
  // ── SHARED ──
  const [takeHome, setTakeHome] = useState(2600);
  const [weeklyCost, setWeeklyCost] = useState(75);
  const [utilities, setUtilities] = useState(500);
  const [startingCapital, setStartingCapital] = useState(50000);
  const [downPct, setDownPct] = useState(3);
  const [buyClosingCostPct, setBuyClosingCostPct] = useState(2.5);
  const [rate, setRate] = useState(5.875);
  const [taxPct, setTaxPct] = useState(1.21);
  const [ins, setIns] = useState(1500);
  const [investRet, setInvestRet] = useState(7);
  const [inflationRate, setInflationRate] = useState(3.0);
  const [years, setYears] = useState(10);
  const [maintVacancyPct, setMaintVacancyPct] = useState(8);
  const [sellingCostPct, setSellingCostPct] = useState(7);
  const [emergencyPct, setEmergencyPct] = useState(0);

  // ── A ──
  const [pA, setPa] = useState(300000);
  const [rA, setRa] = useState(1000);
  const [repA, setRepA] = useState(0);
  const [appA, setAppA] = useState(2.5);
  const [rgA, setRgA] = useState(2);

  // ── B ──
  const [pB, setPb] = useState(375000);
  const [rB, setRb] = useState(1200);
  const [repB, setRepB] = useState(0);
  const [appB, setAppB] = useState(3.0);
  const [rgB, setRgB] = useState(2);

  // ── C: NEVER BUY ──
  const [monthlyRent, setMonthlyRent] = useState(1000);
  const [rentInflation, setRentInflation] = useState(3);
  const [renterIns, setRenterIns] = useState(15);

  const livingMonthly = weeklyCost * 52 / 12;
  const monthlyIncome = takeHome * 2;
  const r = investRet / 100;

  // ── HOUSE-HACK CALC ──
  const calcBuy = (price, rent, repairs, appRate, rentGrowth) => {
    const down = Math.round(price * downPct / 100);
    const loan = price - down;
    const monthlyPI = pmt(rate / 100, 30, loan);
    const monthlyTax = Math.round(price * taxPct / 100 / 12);
    const monthlyIns = Math.round(ins / 12);
    const totalPITI = monthlyPI + monthlyTax + monthlyIns;

    const buyClosingCosts = Math.round(price * (buyClosingCostPct / 100));
    const emergencyFund = Math.round(price * emergencyPct / 100);
    const cashToClose = down + repairs + buyClosingCosts;
    const leftoverCapital = startingCapital - cashToClose - emergencyFund;

    const effectiveRentYear1 = rent * (1 - maintVacancyPct / 100);
    const netHousing = totalPITI - effectiveRentYear1 + utilities;
    const totalExpenses = netHousing + livingMonthly;
    const surplus = monthlyIncome - totalExpenses;
    const housingPctGross = netHousing / monthlyIncome * 100;

    let portfolioValue = leftoverCapital > 0 ? leftoverCapital : 0;
    let totalRentCollected = 0;

    for (let y = 1; y <= years; y++) {
      const inflFactor = Math.pow(1 + inflationRate / 100, y - 1);
      const curRent = rent * Math.pow(1 + rentGrowth / 100, y - 1);
      const curEffRent = curRent * (1 - maintVacancyPct / 100);
      totalRentCollected += curEffRent * 12;
      const curTakeHome = monthlyIncome * Math.pow(1.03, y - 1);
      const curUtils = utilities * inflFactor;
      const curLiving = livingMonthly * inflFactor;
      const curTax = monthlyTax * inflFactor;
      const curIns = monthlyIns * inflFactor;
      const curPITI = monthlyPI + curTax + curIns;
      const curNet = curPITI - curEffRent + curUtils;
      const curSurplus = curTakeHome - (curNet + curLiving);
      portfolioValue = (portfolioValue + curSurplus * 12) * (1 + r);
    }

    const monthlyR = rate / 100 / 12;
    let balance = loan;
    for (let i = 0; i < years * 12; i++) { balance = balance * (1 + monthlyR) - monthlyPI; }
    balance = Math.max(balance, 0);

    const homeValue = price * Math.pow(1 + appRate / 100, years);
    const grossEquity = homeValue - balance;
    const sellingCost = homeValue * (sellingCostPct / 100);
    const netEquity = grossEquity - sellingCost;
    const totalWealth = portfolioValue + netEquity;

    return {
      down, loan, buyClosingCosts, emergencyFund, totalPITI: Math.round(totalPITI), cashToClose,
      leftoverCapital: Math.round(leftoverCapital),
      effectiveRentYear1: Math.round(effectiveRentYear1),
      netHousing: Math.round(netHousing), totalExpenses: Math.round(totalExpenses),
      surplus: Math.round(surplus), surplusChk: Math.round(surplus / 2),
      housingPctGross,
      portfolioValue: Math.round(portfolioValue),
      grossEquity: Math.round(grossEquity), sellingCost: Math.round(sellingCost),
      netEquity: Math.round(netEquity), totalWealth: Math.round(totalWealth),
      homeValue: Math.round(homeValue), totalRentCollected: Math.round(totalRentCollected),
      balance: Math.round(balance),
    };
  };

  // ── NEVER-BUY CALC ──
  const calcNeverBuy = () => {
    let portfolioValue = startingCapital;
    let totalRentPaid = 0;

    const year1Expenses = monthlyRent + renterIns + livingMonthly;
    const surplus0 = monthlyIncome - year1Expenses;

    for (let y = 1; y <= years; y++) {
      const inflFactor = Math.pow(1 + inflationRate / 100, y - 1);
      const curRent = monthlyRent * Math.pow(1 + rentInflation / 100, y - 1);
      totalRentPaid += curRent * 12;
      const curTakeHome = monthlyIncome * Math.pow(1.03, y - 1);
      const curLiving = livingMonthly * inflFactor;
      const curRenterIns = renterIns * inflFactor;
      const curExpenses = curRent + curRenterIns + curLiving;
      const curSurplus = curTakeHome - curExpenses;
      portfolioValue = (portfolioValue + curSurplus * 12) * (1 + r);
    }

    const housingPct = monthlyRent / monthlyIncome * 100;

    return {
      down: 0, loan: 0, buyClosingCosts: 0, totalPITI: 0, cashToClose: 0,
      leftoverCapital: startingCapital,
      effectiveRentYear1: 0,
      netHousing: Math.round(monthlyRent + renterIns),
      totalExpenses: Math.round(monthlyRent + renterIns + livingMonthly),
      surplus: Math.round(surplus0), surplusChk: Math.round(surplus0 / 2),
      housingPctGross: housingPct,
      portfolioValue: Math.round(portfolioValue),
      grossEquity: 0, sellingCost: 0, netEquity: 0,
      totalWealth: Math.round(portfolioValue),
      homeValue: 0, totalRentCollected: 0, totalRentPaid: Math.round(totalRentPaid),
      balance: 0,
    };
  };

  const deps = [takeHome, weeklyCost, utilities, startingCapital, downPct, buyClosingCostPct, rate, taxPct, ins, investRet, inflationRate, years, maintVacancyPct, sellingCostPct, emergencyPct];
  const a = useMemo(() => calcBuy(pA, rA, repA, appA, rgA), [pA, rA, repA, appA, rgA, ...deps]);
  const b = useMemo(() => calcBuy(pB, rB, repB, appB, rgB), [pB, rB, repB, appB, rgB, ...deps]);
  const c = useMemo(() => calcNeverBuy(), [monthlyRent, rentInflation, renterIns, ...deps]);

  // ── WINNER ──
  const allW = [a.totalWealth, b.totalWealth, c.totalWealth];
  const maxW = Math.max(...allW);
  const winIdx = allW.indexOf(maxW);
  const winLabel = ["A", "B", "C"][winIdx];
  const winName = ["Buy Cheaper", "Buy Better", "Never Buy (S&P)"][winIdx];
  const winColor = [COLORS.A, COLORS.B, COLORS.C][winIdx];
  const secondW = [...allW].sort((x, y) => y - x)[1];
  const margin = maxW - secondW;

  const wHigh = (...vals) => { const m = Math.max(...vals); return vals.indexOf(m); };
  
  const wLow = (...vals) => { 
    const v = vals.map(x => (x === null || x === undefined) ? Infinity : x); 
    const m = Math.min(...v); 
    return v.indexOf(m); 
  };

  return (
    <div style={{ "--mono": "'JetBrains Mono', monospace", "--body": "'Outfit', sans-serif",
      background: "#080b12", minHeight: "100vh", color: "#dce4f0", fontFamily: "var(--body)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d0f1a 50%, #0a1628 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "24px 20px" }}>
        <div style={{ maxWidth: 1150, margin: "0 auto" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: "#fbbf24", fontFamily: "var(--mono)", marginBottom: 5 }}>HOUSE-HACK SHOWDOWN v3.1</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "#fff" }}>
            Buy Cheap <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>vs.</span> Buy Better <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>vs.</span> Never Buy (S&P 500)
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Accounts for inflation, vacancy, selling costs, and starting capital. Leftover capital invested on day 1.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1150, margin: "0 auto", padding: "18px 20px 48px" }}>

        {/* SHARED */}
        <div style={{ marginBottom: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.25)", fontFamily: "var(--mono)", marginBottom: 10 }}>SHARED ASSUMPTIONS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 20px" }}>
            <Slider label="Starting Capital" value={startingCapital} onChange={setStartingCapital} min={10000} max={150000} step={1000} color="#fff" />
            <Slider label="Take-Home / Check" value={takeHome} onChange={setTakeHome} min={1500} max={5000} step={50} color="#fff" />
            <Slider label="Groceries + Gas / Wk" value={weeklyCost} onChange={setWeeklyCost} min={50} max={200} step={5} color="#fff" />
            <Slider label="Utilities / Mo (owner)" value={utilities} onChange={setUtilities} min={200} max={800} step={25} color="#fff" />
            <Slider label="General Inflation" value={inflationRate} onChange={setInflationRate} min={0} max={8} step={0.5} prefix="" suffix="%" color="#fff" />
            <Slider label="Maint. & Vacancy" value={maintVacancyPct} onChange={setMaintVacancyPct} min={0} max={20} step={1} prefix="" suffix="%" color="#fff" />
            <Slider label="Buy Closing Costs" value={buyClosingCostPct} onChange={setBuyClosingCostPct} min={0} max={6} step={0.1} prefix="" suffix="%" color="#fff" />
            <Slider label="Cost to Sell" value={sellingCostPct} onChange={setSellingCostPct} min={0} max={10} step={0.5} prefix="" suffix="%" color="#fff" />
            <Slider label="Emergency Fund % of Price" value={emergencyPct} onChange={setEmergencyPct} min={0} max={5} step={0.5} prefix="" suffix="%" color="#fff" />
            <Slider label="Down Payment %" value={downPct} onChange={setDownPct} min={0} max={20} step={0.5} prefix="" suffix="%" color="#fff" />
            <Slider label="Mortgage Rate" value={rate} onChange={setRate} min={4} max={8} step={0.125} prefix="" suffix="%" color="#fff" />
            <Slider label="Property Tax" value={taxPct} onChange={setTaxPct} min={0.5} max={2} step={0.01} prefix="" suffix="%" color="#fff" />
            <Slider label="Home Insurance / Yr" value={ins} onChange={setIns} min={800} max={3000} step={100} color="#fff" />
            <Slider label="Investment Return" value={investRet} onChange={setInvestRet} min={4} max={12} step={0.5} prefix="" suffix="%" color="#fff" />
            <Slider label="Projection Years" value={years} onChange={setYears} min={5} max={30} step={1} prefix="" suffix=" yrs" color="#fff" />
          </div>
        </div>

        {/* 3 PANELS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {/* A */}
          <div style={{ background: `linear-gradient(180deg, ${BGS.A}0.04) 0%, ${BGS.A}0.01) 100%)`,
            border: `1px solid ${BGS.A}0.15)`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.A }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: COLORS.A, fontFamily: "var(--mono)" }}>A: BUY CHEAPER</span>
            </div>
            <Slider label="Home Price" value={pA} onChange={setPa} min={200000} max={500000} step={5000} color={COLORS.A} />
            <Slider label="Rental Income / Mo" value={rA} onChange={setRa} min={0} max={3000} step={50} color={COLORS.A} />
            <Slider label="Upfront Repairs" value={repA} onChange={setRepA} min={0} max={50000} step={1000} color={COLORS.A} />
            <Slider label="Appreciation" value={appA} onChange={setAppA} min={0} max={6} step={0.25} prefix="" suffix="%" color={COLORS.A} />
            <Slider label="Rent Growth" value={rgA} onChange={setRgA} min={0} max={5} step={0.5} prefix="" suffix="%" color={COLORS.A} />
          </div>
          {/* B */}
          <div style={{ background: `linear-gradient(180deg, ${BGS.B}0.04) 0%, ${BGS.B}0.01) 100%)`,
            border: `1px solid ${BGS.B}0.15)`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.B }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: COLORS.B, fontFamily: "var(--mono)" }}>B: BUY BETTER</span>
            </div>
            <Slider label="Home Price" value={pB} onChange={setPb} min={200000} max={500000} step={5000} color={COLORS.B} />
            <Slider label="Rental Income / Mo" value={rB} onChange={setRb} min={0} max={3000} step={50} color={COLORS.B} />
            <Slider label="Upfront Repairs" value={repB} onChange={setRepB} min={0} max={50000} step={1000} color={COLORS.B} />
            <Slider label="Appreciation" value={appB} onChange={setAppB} min={0} max={6} step={0.25} prefix="" suffix="%" color={COLORS.B} />
            <Slider label="Rent Growth" value={rgB} onChange={setRgB} min={0} max={5} step={0.5} prefix="" suffix="%" color={COLORS.B} />
          </div>
          {/* C */}
          <div style={{ background: `linear-gradient(180deg, ${BGS.C}0.04) 0%, ${BGS.C}0.01) 100%)`,
            border: `1px solid ${BGS.C}0.15)`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.C }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: COLORS.C, fontFamily: "var(--mono)" }}>C: NEVER BUY (S&P)</span>
            </div>
            <Slider label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} min={500} max={2500} step={50} color={COLORS.C} />
            <Slider label="Rent Inflation / Yr" value={rentInflation} onChange={setRentInflation} min={0} max={6} step={0.5} prefix="" suffix="%" color={COLORS.C} />
            <Slider label="Renter's Insurance / Mo" value={renterIns} onChange={setRenterIns} min={10} max={50} step={5} color={COLORS.C} />
            <div style={{ marginTop: 10, padding: "8px 0", borderTop: `1px solid ${BGS.C}0.1)` }}>
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
              {years}-YEAR VERDICT (LIQUID NET WORTH)
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              Option {winLabel}: {winName} <span style={{ color: winColor }}>wins by {fmt(margin)}</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
              {winIdx === 2
                ? `The S&P outpaces both house-hacks. Rental income doesn't overcome mortgage overhead + selling costs at these assumptions.`
                : winIdx === 0
                ? `The cheaper house-hack wins through lower entry cost, more leftover capital invested, and solid rental yield.`
                : `The better property's appreciation and rental income overcome the larger mortgage and lower day-1 investment.`}
              {winIdx !== 2 && ` S&P-only trails by ${fmt(maxW - c.totalWealth)}.`}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "var(--mono)", marginBottom: 4 }}>TOTAL WEALTH</div>
            {["A", "B", "C"].map((l, i) => (
              <div key={l} style={{ fontFamily: "var(--mono)", fontSize: 11, color: i === winIdx ? [COLORS.A, COLORS.B, COLORS.C][i] : "rgba(255,255,255,0.3)" }}>
                {l}: {fmt(allW[i])}
              </div>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: "rgba(255,255,255,0.2)", fontFamily: "var(--mono)" }}>METRIC</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: COLORS.A, fontFamily: "var(--mono)", textAlign: "center" }}>A: {fmt(pA)}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: COLORS.B, fontFamily: "var(--mono)", textAlign: "center" }}>B: {fmt(pB)}</div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: COLORS.C, fontFamily: "var(--mono)", textAlign: "center" }}>C: RENT+S&P</div>
          </div>

          <Row3 label="UPFRONT CAPITAL ALLOCATION" section />
          <Row3 label="Cash to Close" vals={[a.cashToClose, b.cashToClose, 0]} winIdx={wLow(a.cashToClose, b.cashToClose, 0)} />
          <Row3 label="Buy Closing Costs" vals={[a.buyClosingCosts, b.buyClosingCosts, 0]} winIdx={wLow(a.buyClosingCosts, b.buyClosingCosts, 0)} />
          <Row3 label="Emergency Fund (set aside)" vals={[a.emergencyFund, b.emergencyFund, 0]} winIdx={wLow(a.emergencyFund, b.emergencyFund, 0)} />
          <Row3 label="Leftover Capital → Invested Day 1" vals={[a.leftoverCapital, b.leftoverCapital, startingCapital]} winIdx={wHigh(a.leftoverCapital, b.leftoverCapital, startingCapital)} highlight />

          <Row3 label="MONTHLY PICTURE (YEAR 1)" section />
          <Row3 label="Mortgage PITI" vals={[a.totalPITI, b.totalPITI, null]} />
          <Row3 label="Rent Paid" vals={[null, null, monthlyRent]} />
          <Row3 label="Effective Rental Income" vals={[a.effectiveRentYear1, b.effectiveRentYear1, null]} winIdx={a.effectiveRentYear1 > b.effectiveRentYear1 ? 0 : 1} />
          <Row3 label="Mortgage % of Take-Home" vals={[a.housingPctGross, b.housingPctGross, c.housingPctGross]}
            fmtFn={v => v.toFixed(1) + "%"} winIdx={wLow(a.housingPctGross, b.housingPctGross, c.housingPctGross)} highlight />
          <Row3 label="Net Housing Cost" vals={[a.netHousing, b.netHousing, c.netHousing]} winIdx={wLow(a.netHousing, b.netHousing, c.netHousing)} highlight />
          <Row3 label="Total Monthly Expenses" vals={[a.totalExpenses, b.totalExpenses, c.totalExpenses]} winIdx={wLow(a.totalExpenses, b.totalExpenses, c.totalExpenses)} />
          <Row3 label="Monthly Surplus → Invest" vals={[a.surplus, b.surplus, c.surplus]} winIdx={wHigh(a.surplus, b.surplus, c.surplus)} highlight />
          <Row3 label="Surplus / Check" vals={[a.surplusChk, b.surplusChk, c.surplusChk]} winIdx={wHigh(a.surplusChk, b.surplusChk, c.surplusChk)} />

          <Row3 label={`${years}-YEAR OUTCOME`} section />
          <Row3 label="Home Value" vals={[a.homeValue, b.homeValue, null]} winIdx={a.homeValue > b.homeValue ? 0 : 1} />
          <Row3 label="Remaining Mortgage" vals={[a.balance, b.balance, null]} />
          <Row3 label={`Cost to Sell (${sellingCostPct}%)`} vals={[-a.sellingCost, -b.sellingCost, 0]} winIdx={2} flipColor />
          <Row3 label="Net Home Equity" vals={[a.netEquity, b.netEquity, 0]} winIdx={wHigh(a.netEquity, b.netEquity, 0)} />
          <Row3 label="Total Rent Paid" vals={[0, 0, c.totalRentPaid]} fmtFn={v => v === 0 ? "$0" : fmt(-v)} winIdx={0} />
          <Row3 label="Investment Portfolio" vals={[a.portfolioValue, b.portfolioValue, c.portfolioValue]} winIdx={wHigh(a.portfolioValue, b.portfolioValue, c.portfolioValue)} highlight />
          <Row3 label="LIQUID NET WORTH" vals={[a.totalWealth, b.totalWealth, c.totalWealth]} winIdx={winIdx} highlight />

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", padding: "10px 12px",
            background: `${BGS[winLabel]}0.05)`, borderTop: `2px solid ${BGS[winLabel]}0.2)` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Winner</div>
            {allW.map((v, i) => (
              <div key={i} style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--mono)", textAlign: "center",
                color: i === winIdx ? [COLORS.A, COLORS.B, COLORS.C][i] : "rgba(255,255,255,0.2)" }}>
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
              <strong style={{ color: "#fff" }}>Leverage vs. liquidity.</strong> The house-hacker controls a {fmt(pA)}–{fmt(pB)} asset with {fmt(a.cashToClose)}–{fmt(b.cashToClose)} down.
              The renter invests the full {fmt(startingCapital)} at {investRet}% with zero leverage. At {appA}–{appB}% appreciation, that’s {Math.round(pA / Math.max(a.down, 1))}x–{Math.round(pB / Math.max(b.down, 1))}x leverage on the buy side.
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <strong style={{ color: "#fff" }}>The renter’s hidden cost: inflation.</strong> Rent inflates at {rentInflation}%/yr. The mortgage is fixed forever.
              Over {years} years, the renter’s housing cost rises from {fmt(monthlyRent)} to {fmt(Math.round(monthlyRent * Math.pow(1 + rentInflation / 100, years)))}/mo.
              The homeowner’s P&I never changes. That widening gap compounds.
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              <strong style={{ color: "#fff" }}>Selling costs are the house-hack’s tax.</strong> At {sellingCostPct}%, selling a {fmt(a.homeValue)}–{fmt(b.homeValue)} home costs {fmt(a.sellingCost)}–{fmt(b.sellingCost)}.
              The renter pays $0 to exit. {sellingCostPct >= 6 ? "Try reducing selling costs to 5% (discount broker) to see how it shifts the outcome." : ""}
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
            {winIdx !== 2 ? (
              <>
                The S&P path would need roughly <strong style={{ color: COLORS.C }}>{((maxW - c.totalWealth) / c.portfolioValue * 100 + investRet).toFixed(1)}% annual returns</strong> to
                match Option {winLabel} at current assumptions. Or rental income would need to drop to <strong style={{ color: COLORS.C }}>{fmt(Math.max(0, Math.round(rA - calcRequiredMonthlyRent(a.totalWealth - c.totalWealth, years, investRet))))}</strong>/mo on
                Option A for the market to win. The house-hack’s edge is tenants + leverage — erode either and the S&P catches up.
              </>
            ) : (
              <>
                A house-hack would win if rental income exceeds roughly <strong style={{ color: COLORS.A }}>{fmt(Math.round(rA + calcRequiredMonthlyRent(c.totalWealth - a.totalWealth, years, investRet)))}</strong>/mo on Option A,
                or if appreciation exceeds <strong style={{ color: COLORS.A }}>{(appA + (c.totalWealth - a.totalWealth) / pA / years * 100).toFixed(1)}%</strong>.
                At current assumptions, the market’s {investRet}% compounding on {fmt(startingCapital)} day-1 capital beats leveraged real estate.
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 14, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)",
          fontSize: 7, color: "rgba(255,255,255,0.1)", fontFamily: "var(--mono)", textAlign: "center" }}>
          HOUSE-HACK SHOWDOWN v3.1 · 3% raise · {inflationRate}% inflation · {maintVacancyPct}% vacancy · {sellingCostPct}% sell cost · {investRet}% S&P · 30yr fixed
        </div>
      </div>
    </div>
  );
}
