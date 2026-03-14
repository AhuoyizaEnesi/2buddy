"use client";

import React from "react";

export type Tool =
  | "pen"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "text"
  | "laser"
  | "sticky";

export type Background =
  | "white"
  | "dots"
  | "grid"
  | "lined"
  | "isometric"
  | "chalkboard";

interface ToolbarProps {
  activeTool: Tool;
  activeColor: string;
  strokeSize: number;
  activeBackground: Background;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeSizeChange: (size: number) => void;
  onBackgroundChange: (bg: Background) => void;
  onClear: () => void;
  onUndo: () => void;
}

const colors = [
  "#1a1a1a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

const strokeSizes = [2, 4, 6, 10, 16];

const backgrounds: { id: Background; label: string }[] = [
  { id: "white", label: "Plain white" },
  { id: "dots", label: "Dot grid" },
  { id: "grid", label: "Square grid" },
  { id: "lined", label: "Lined" },
  { id: "isometric", label: "Isometric" },
  { id: "chalkboard", label: "Chalkboard" },
];

export default function Toolbar({
  activeTool,
  activeColor,
  strokeSize,
  activeBackground,
  onToolChange,
  onColorChange,
  onStrokeSizeChange,
  onBackgroundChange,
  onClear,
  onUndo,
}: ToolbarProps) {
  const btn = (
    id: Tool,
    label: string,
    content: React.ReactNode
  ) => (
    <button
      key={id}
      title={label}
      onClick={() => onToolChange(id)}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        backgroundColor: activeTool === id ? "#ede9fe" : "transparent",
        color: activeTool === id ? "#6d28d9" : "#6b7280",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (activeTool !== id)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6";
      }}
      onMouseLeave={(e) => {
        if (activeTool !== id)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
    >
      {content}
    </button>
  );

  const divider = () => (
    <div style={{ width: 32, height: 1, backgroundColor: "#e5e7eb", margin: "4px 0" }} />
  );

  const iconBtn = (
    label: string,
    onClick: () => void,
    content: React.ReactNode,
    danger = false
  ) => (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        backgroundColor: "transparent",
        color: danger ? "#ef4444" : "#6b7280",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          danger ? "#fef2f2" : "#f3f4f6";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
    >
      {content}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: "12px 6px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        width: 52,
        alignItems: "center",
        overflowY: "auto",
        maxHeight: "100%",
      }}
    >
      {btn("pen", "Pen",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      )}

      {btn("eraser", "Eraser",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.78-.78 2.05 0 2.83L5.03 20H8l9.73-9.73a2 2 0 000-2.83l-1.18-1.18V3h-1.41zM6.21 19l-1.8-1.8 5.37-5.37 1.8 1.8L6.21 19zM20 19h-8v2h8v-2z" />
        </svg>
      )}

      {btn("line", "Line",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13H5v-2h14v2z" />
        </svg>
      )}

      {btn("rectangle", "Rectangle",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="1" />
        </svg>
      )}

      {btn("circle", "Circle",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}

      {btn("text", "Text",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 4v3h5.5v12h3V7H19V4z" />
        </svg>
      )}

      {btn("laser", "Laser pointer",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      {btn("sticky", "Sticky note",
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        </svg>
      )}

      {divider()}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            title={color}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: color,
              border: activeColor === color ? "2px solid #7c3aed" : "2px solid #d1d5db",
              cursor: "pointer",
              transform: activeColor === color ? "scale(1.15)" : "scale(1)",
              transition: "all 0.15s",
              padding: 0,
            }}
          />
        ))}
        <input
          type="color"
          value={activeColor}
          onChange={(e) => onColorChange(e.target.value)}
          title="Custom color"
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "2px solid #d1d5db",
            cursor: "pointer",
            padding: 0,
          }}
        />
      </div>

      {divider()}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {strokeSizes.map((size) => (
          <button
            key={size}
            onClick={() => onStrokeSizeChange(size)}
            title={`${size}px`}
            style={{
              width: 36,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              backgroundColor: strokeSize === size ? "#ede9fe" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                width: Math.min(size + 10, 26),
                height: size,
                borderRadius: size,
                backgroundColor: strokeSize === size ? "#7c3aed" : "#6b7280",
              }}
            />
          </button>
        ))}
      </div>

      {divider()}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {backgrounds.map((bg) => (
          <button
            key={bg.id}
            onClick={() => onBackgroundChange(bg.id)}
            title={bg.label}
            style={{
              width: 36,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: activeBackground === bg.id ? "2px solid #7c3aed" : "2px solid #e5e7eb",
              cursor: "pointer",
              backgroundColor: activeBackground === bg.id ? "#ede9fe" : "#ffffff",
              fontSize: 8,
              color: activeBackground === bg.id ? "#6d28d9" : "#6b7280",
              fontWeight: 500,
              transition: "all 0.15s",
              padding: "0 2px",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {bg.id === "white" && (
              <div style={{ width: 20, height: 14, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: 2 }} />
            )}
            {bg.id === "dots" && (
              <div style={{ width: 20, height: 14, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: 2, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", alignItems: "center", justifyItems: "center", padding: 2 }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", backgroundColor: "#9ca3af" }} />
                ))}
              </div>
            )}
            {bg.id === "grid" && (
              <div style={{ width: 20, height: 14, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: 2, backgroundImage: "linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)", backgroundSize: "5px 5px" }} />
            )}
            {bg.id === "lined" && (
              <div style={{ width: 20, height: 14, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: 2, backgroundImage: "linear-gradient(#d1d5db 1px, transparent 1px)", backgroundSize: "100% 4px" }} />
            )}
            {bg.id === "isometric" && (
              <div style={{ width: 20, height: 14, backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: 2, overflow: "hidden" }}>
                <svg width="20" height="14" viewBox="0 0 20 14">
                  <line x1="0" y1="7" x2="20" y2="7" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="0" y1="0" x2="10" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="10" y1="0" x2="20" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="20" y1="0" x2="30" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="-10" y1="0" x2="0" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="0" y1="0" x2="-10" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="10" y1="0" x2="0" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="20" y1="0" x2="10" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                  <line x1="30" y1="0" x2="20" y2="14" stroke="#d1d5db" strokeWidth="0.5" />
                </svg>
              </div>
            )}
            {bg.id === "chalkboard" && (
              <div style={{ width: 20, height: 14, backgroundColor: "#1a3a2a", border: "1px solid #2d5a3d", borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {divider()}

      {iconBtn("Undo", onUndo,
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
        </svg>
      )}

      {iconBtn("Clear board", onClear,
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>,
        true
      )}
    </div>
  );
}