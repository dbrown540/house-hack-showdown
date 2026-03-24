export function pmt(rate, nper, pv) {
  if (rate === 0) return pv / nper;
  const r = rate / 12;
  const n = nper * 12;
  return pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calcRequiredMonthlyRent(gap, years, annualRate) {
  if (gap <= 0) return 0;
  const r = annualRate / 100;
  if (r === 0) return Math.round(gap / years / 12);
  const annualExtra = (gap * r) / (Math.pow(1 + r, years) - 1);
  return Math.round(annualExtra / 12);
}

export const fmt = (v) => {
  if (v === 0) return "$0";
  if (v === null || v === undefined) return "—";
  const neg = v < 0;
  const s = Math.abs(Math.round(v)).toLocaleString();
  return (neg ? "-$" : "$") + s;
};
