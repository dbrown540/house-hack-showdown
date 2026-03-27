import { useState } from "react";

export const Slider = ({ label, value, onChange, min, max, step = 1, prefix = "$", suffix = "", color = "#fbbf24", tooltip }) => {
  const [tipVisible, setTipVisible] = useState(false);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "var(--body)" }}>
          {label}
          {tooltip && (
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span
                onMouseEnter={() => setTipVisible(true)}
                onMouseLeave={() => setTipVisible(false)}
                style={{ cursor: "default", fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1, userSelect: "none" }}
              >ⓘ</span>
              {tipVisible && (
                <span style={{
                  position: "absolute",
                  left: "50%",
                  top: "calc(100% + 4px)",
                  transform: "translateX(-50%)",
                  background: "#1a1a2e",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  padding: "6px 9px",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.75)",
                  fontFamily: "var(--body)",
                  whiteSpace: "normal",
                  width: 180,
                  lineHeight: 1.45,
                  zIndex: 100,
                  pointerEvents: "none",
                }}>
                  {tooltip}
                </span>
              )}
            </span>
          )}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "var(--mono)" }}>
          {prefix}{typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : Math.round(value).toLocaleString()}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer", height: 3 }} />
    </div>
  );
};
