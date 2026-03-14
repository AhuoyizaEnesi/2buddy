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

const bgLabels: Record<Background, string> = {
  white: "White",
  dots: "Dots",
  grid: "Grid",
  lined: "Lined",
  isometric: "Iso",
  chalkboard: "Chalk",
};

export default function FloatingToolbar({
  activeTool,
  activeBackground,
  onToolChange,
  onBackgroundChange,
  onClear,
  onUndo,
  onExport,
}: FloatingToolbarProps) {
  return (
    <div style={{
      position: "absolute",
      top: 20,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#ffffff",
      borderRadius: 12,
      padding: "6px 12px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      border: "1px solid #e5e7eb",
    }}>
      <button
        onClick={() => onToolChange("pen")}
        title="Pen"
        style={{
          width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
          backgroundColor: activeTool === "pen" ? "#2563eb" : "transparent",
          color: activeTool === "pen" ? "#ffffff" : "#6b7280",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      </button>

      <button
        onClick={() => onToolChange("eraser")}
        title="Eraser"
        style={{
          width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
          backgroundColor: activeTool === "eraser" ? "#2563eb" : "transparent",
          color: activeTool === "eraser" ? "#ffffff" : "#6b7280",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.78-.78 2.05 0 2.83L5.03 20H8l9.73-9.73a2 2 0 000-2.83l-1.18-1.18V3h-1.41zM6.21 19l-1.8-1.8 5.37-5.37 1.8 1.8L6.21 19zM20 19h-8v2h8v-2z" />
        </svg>
      </button>

      <div style={{ width: 1, height: 24, backgroundColor: "#e5e7eb" }} />

      <select
        value={activeBackground}
        onChange={(e) => onBackgroundChange(e.target.value as Background)}
        style={{
          padding: "4px 8px", borderRadius: 8, border: "1px solid #e5e7eb",
          fontSize: 12, color: "#374151", backgroundColor: "#ffffff", cursor: "pointer",
        }}
      >
        {(Object.keys(bgLabels) as Background[]).map((bg) => (
          <option key={bg} value={bg}>{bgLabels[bg]}</option>
        ))}
      </select>

      <div style={{ width: 1, height: 24, backgroundColor: "#e5e7eb" }} />

      <button
        onClick={onUndo}
        title="Undo"
        style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
        </svg>
      </button>

      <button
        onClick={onClear}
        title="Clear board"
        style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>

      <button
        onClick={onExport}
        title="Export board as PNG"
        style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
      </button>
    </div>
  );
}