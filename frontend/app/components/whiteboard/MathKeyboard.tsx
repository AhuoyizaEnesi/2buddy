"use client";

import React, { useState } from "react";

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  onClose: () => void;
}

const categories = [
  {
    label: "Basic",
    symbols: [
      { display: "+", value: "+" },
      { display: "−", value: "−" },
      { display: "×", value: "×" },
      { display: "÷", value: "÷" },
      { display: "=", value: "=" },
      { display: "≠", value: "≠" },
      { display: "≈", value: "≈" },
      { display: "±", value: "±" },
      { display: "<", value: "<" },
      { display: ">", value: ">" },
      { display: "≤", value: "≤" },
      { display: "≥", value: "≥" },
    ],
  },
  {
    label: "Algebra",
    symbols: [
      { display: "x²", value: "x²" },
      { display: "x³", value: "x³" },
      { display: "xⁿ", value: "xⁿ" },
      { display: "√", value: "√" },
      { display: "∛", value: "∛" },
      { display: "∞", value: "∞" },
      { display: "|x|", value: "|x|" },
      { display: "f(x)", value: "f(x)" },
      { display: "∝", value: "∝" },
      { display: "∴", value: "∴" },
      { display: "∵", value: "∵" },
      { display: "%", value: "%" },
    ],
  },
  {
    label: "Calculus",
    symbols: [
      { display: "∫", value: "∫" },
      { display: "∬", value: "∬" },
      { display: "∮", value: "∮" },
      { display: "∂", value: "∂" },
      { display: "∇", value: "∇" },
      { display: "Δ", value: "Δ" },
      { display: "lim", value: "lim" },
      { display: "d/dx", value: "d/dx" },
      { display: "dy/dx", value: "dy/dx" },
      { display: "∑", value: "∑" },
      { display: "∏", value: "∏" },
      { display: "∀", value: "∀" },
    ],
  },
  {
    label: "Greek",
    symbols: [
      { display: "α", value: "α" },
      { display: "β", value: "β" },
      { display: "γ", value: "γ" },
      { display: "δ", value: "δ" },
      { display: "ε", value: "ε" },
      { display: "θ", value: "θ" },
      { display: "λ", value: "λ" },
      { display: "μ", value: "μ" },
      { display: "π", value: "π" },
      { display: "σ", value: "σ" },
      { display: "φ", value: "φ" },
      { display: "ω", value: "ω" },
    ],
  },
  {
    label: "Sets",
    symbols: [
      { display: "∈", value: "∈" },
      { display: "∉", value: "∉" },
      { display: "⊂", value: "⊂" },
      { display: "⊃", value: "⊃" },
      { display: "⊆", value: "⊆" },
      { display: "⊇", value: "⊇" },
      { display: "∪", value: "∪" },
      { display: "∩", value: "∩" },
      { display: "∅", value: "∅" },
      { display: "ℝ", value: "ℝ" },
      { display: "ℤ", value: "ℤ" },
      { display: "ℕ", value: "ℕ" },
    ],
  },
  {
    label: "Geometry",
    symbols: [
      { display: "°", value: "°" },
      { display: "∠", value: "∠" },
      { display: "⊥", value: "⊥" },
      { display: "∥", value: "∥" },
      { display: "△", value: "△" },
      { display: "□", value: "□" },
      { display: "○", value: "○" },
      { display: "π", value: "π" },
      { display: "≅", value: "≅" },
      { display: "∼", value: "∼" },
      { display: "⌒", value: "⌒" },
      { display: "→", value: "→" },
    ],
  },
];

export default function MathKeyboard({ onInsert, onClose }: MathKeyboardProps) {
  const [activeCategory, setActiveCategory] = useState("Basic");
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);

  const handleInsert = (value: string) => {
    onInsert(value);
    setRecentSymbols((prev) => {
      const filtered = prev.filter((s) => s !== value);
      return [value, ...filtered].slice(0, 12);
    });
  };

  const activeSymbols =
    activeCategory === "Recent"
      ? recentSymbols.map((s) => ({ display: s, value: s }))
      : categories.find((c) => c.label === activeCategory)?.symbols || [];

  const tabs = recentSymbols.length > 0
    ? ["Recent", ...categories.map((c) => c.label)]
    : categories.map((c) => c.label);

  return (
    <div style={{
      position: "absolute",
      bottom: 60,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 200,
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      width: 420,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: "1px solid #f3f4f6",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Math keyboard
        </span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: "0 4px" }}
        >
          ×
        </button>
      </div>

      <div style={{
        display: "flex", gap: 0, borderBottom: "1px solid #f3f4f6",
        overflowX: "auto",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveCategory(tab)}
            style={{
              padding: "8px 12px", border: "none", cursor: "pointer",
              backgroundColor: "transparent", fontSize: 11, fontWeight: 600,
              color: activeCategory === tab ? "#1e3a5f" : "#9ca3af",
              borderBottom: activeCategory === tab ? "2px solid #2563eb" : "2px solid transparent",
              whiteSpace: "nowrap", transition: "all 0.1s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
        gap: 4, padding: 12,
      }}>
        {activeSymbols.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "16px 0", fontSize: 12, color: "#9ca3af" }}>
            No recent symbols yet. Click any symbol to add it here.
          </div>
        ) : (
          activeSymbols.map((symbol, i) => (
            <button
              key={i}
              onClick={() => handleInsert(symbol.value)}
              title={symbol.value}
              style={{
                height: 44, display: "flex", alignItems: "center",
                justifyContent: "center", border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb", cursor: "pointer",
                fontSize: 16, color: "#1e3a5f", fontWeight: 500,
                transition: "all 0.1s", borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#eff6ff";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#2563eb";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f9fafb";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
              }}
            >
              {symbol.display}
            </button>
          ))
        )}
      </div>

      <div style={{
        padding: "8px 12px", borderTop: "1px solid #f3f4f6",
        fontSize: 11, color: "#9ca3af", textAlign: "center",
      }}>
        Click any symbol to insert it as text on the board
      </div>
    </div>
  );
}