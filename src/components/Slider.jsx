export const Slider = ({ label, value, onChange, min, max, step = 1, prefix = "$", suffix = "", color = "#fbbf24" }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "var(--body)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "var(--mono)" }}>
        {prefix}{typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : Math.round(value).toLocaleString()}{suffix}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: color, cursor: "pointer", height: 3 }} />
  </div>
);
