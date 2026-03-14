"use client";

import React from "react";
import { Tool, Background } from "./Toolbar";

interface FloatingToolbarProps {
  activeTool: Tool;
  activeBackground: Background;
  onToolChange: (tool: Tool) => void;
  onBackgroundChange: (bg: Background) => void;
  onClear: () => void;
  onUndo: () => void;
  onExport: () => void;
}

export default function FloatingToolbar({
  activeTool,
  activeBackground,
  onToolChange,
  onBackgroundChange,
  onClear,
  onUndo,
  onExport,
}: FloatingToolbarProps) {
  const btn = (
    onClick: () => void,
    title: string,
    active: boolean,
    content: React.ReactNode,
    danger = false
  ) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36, border: "none", cursor: "pointer",
        backgroundColor: active ? "#2563eb" : "transparent",
        color: active ? "#ffffff" : danger ? "#ef4444" : "#6b7280",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 0, transition: "all 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
    >
      {content}
    </button>
  );

  return (
    <div style={{
      position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 50, display: "flex", alignItems: "center", gap: 2,
      backgroundColor: "#ffffff", padding: "4px 8px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb",
      borderRadius: 0,
    }}>
      {btn(() => onToolChange("pen"), "Pen", activeTool === "pen",
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      )}

      {btn(() => onToolChange("eraser"), "Eraser", activeTool === "eraser",
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.78-.78 2.05 0 2.83L5.03 20H8l9.73-9.73a2 2 0 000-2.83l-1.18-1.18V3h-1.41zM6.21 19l-1.8-1.8 5.37-5.37 1.8 1.8L6.21 19zM20 19h-8v2h8v-2z" />
        </svg>
      )}

      <div style={{ width: 1, height: 20, backgroundColor: "#e5e7eb", margin: "0 2px" }} />

      <select
        value={activeBackground}
        onChange={(e) => onBackgroundChange(e.target.value as Background)}
        style={{
          padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 0,
          fontSize: 12, color: "#374151", backgroundColor: "#ffffff",
          cursor: "pointer", height: 32,
        }}
      >
        <option value="white">Plain white</option>
        <option value="dots">Dot grid</option>
        <option value="grid">Square grid</option>
        <option value="lined">Lined</option>
        <option value="isometric">Isometric</option>
        <option value="chalkboard">Chalkboard</option>
      </select>

      <div style={{ width: 1, height: 20, backgroundColor: "#e5e7eb", margin: "0 2px" }} />

      {btn(onUndo, "Undo", false,
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
        </svg>
      )}

      {btn(onClear, "Clear board", false,
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>,
        true
      )}

      {btn(onExport, "Export as PNG", false,
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
      )}
    </div>
  );
}