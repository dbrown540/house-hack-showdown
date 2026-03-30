import { useState } from "react";

export const InfoTip = ({ text }) => {
  const [tipVisible, setTipVisible] = useState(false);

  if (!text) return null;

  return (
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
          {text}
        </span>
      )}
    </span>
  );
};
