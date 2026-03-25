import { COLORS, BGS } from "../utils/constants";
import { fmt } from "../utils/math";

export const Row3 = ({ label, vals, fmtFn = fmt, winIdx, highlight = false, section = false, flipColor = false }) => {
  if (section) return (
    <div style={{ padding: "5px 12px", background: "rgba(251,191,36,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: "#fbbf24", fontFamily: "var(--mono)" }}>{label}</span>
    </div>
  );
  const cols = [COLORS.A, COLORS.B];
  const bgs = [BGS.A, BGS.B];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 0, padding: "6px 12px",
      background: highlight ? "rgba(255,255,255,0.015)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "var(--body)", display: "flex", alignItems: "center" }}>{label}</div>
      {vals.map((v, i) => {
        const isWin = winIdx === i && winIdx !== undefined && winIdx !== null;
        const winColor = flipColor ? "#ef4444" : cols[i];
        return (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)", textAlign: "center",
            color: isWin ? winColor : "rgba(255,255,255,0.6)",
            background: isWin ? (flipColor ? "rgba(239,68,68,0.08)" : `${bgs[i]}0.08)`) : "transparent",
            borderRadius: 3, padding: "2px 4px" }}>
            {v === null || v === undefined ? "—" : fmtFn(v)}
          </div>
        );
      })}
    </div>
  );
};
