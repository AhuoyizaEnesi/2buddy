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
  const toolBtn = (tool: Tool, title: string, icon: React.ReactNode) => (
    <button
      onClick={() => onToolChange(tool)}
      title={title}
      style={{
        width: 44, height: 46, borderRadius: 3, cursor: "pointer",
        backgroundColor: activeTool === tool ? "#b85c2a" : "#faf7f0",
        border: activeTool === tool ? "1.5px solid #7a3a10" : "1.5px solid #a89878",
        color: activeTool === tool ? "#fdf8f0" : "#5c4d37",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 2, padding: 3,
        transition: "background 0.15s",
      }}
    >
      {icon}
      <span style={{ fontFamily: "'Caveat', cursive", fontSize: 9, lineHeight: 1, letterSpacing: "0.5px" }}>
        {title}
      </span>
    </button>
  );

  const iconBtn = (onClick: () => void, title: string, icon: React.ReactNode, danger = false) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 2, cursor: "pointer",
        backgroundColor: danger ? "#f8e0d8" : "#faf7f0",
        border: danger ? "1px solid #c09080" : "1px solid #a89878",
        color: danger ? "#b85c2a" : "#7a6a52",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s",
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      backgroundColor: "#c4b898", height: 58,
      display: "flex", alignItems: "center",
      gap: 6, padding: "0 10px", zIndex: 2,
    }}>
      {toolBtn("pen", "Pencil",
        <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="#f0e060" stroke="#7a6a52" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M15 5l4 4" stroke="#c4a820" strokeWidth="1.2" />
        </svg>
      )}

      {toolBtn("eraser", "Eraser",
        <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
          <rect x="3" y="10" width="14" height="9" rx="1.5" fill="#f0c0b0" stroke="#c08070" strokeWidth="1.3" />
          <rect x="3" y="10" width="6" height="9" rx="1.5" fill="#e09080" stroke="#c08070" strokeWidth="1.3" />
          <line x1="9" y1="10" x2="9" y2="19" stroke="#c08070" strokeWidth="1" />
        </svg>
      )}

      <div style={{ width: 1, height: 36, backgroundColor: "#a89878", margin: "0 2px" }} />

      <select
        value={activeBackground}
        onChange={(e) => onBackgroundChange(e.target.value as Background)}
        style={{
          fontFamily: "'Caveat', cursive", fontSize: 13,
          backgroundColor: "#faf7f0", border: "1px solid #a89878",
          padding: "2px 6px", color: "#3d2f1a", borderRadius: 2,
          height: 30, cursor: "pointer",
        }}
      >
        <option value="white">Blank</option>
        <option value="dots">Dot grid</option>
        <option value="grid">Square grid</option>
        <option value="lined">Lined</option>
        <option value="isometric">Isometric</option>
        <option value="chalkboard">Chalkboard</option>
      </select>

      <div style={{ flex: 1 }} />

      {iconBtn(onUndo, "Undo",
        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
          <path d="M4 8a6 6 0 1 1 1.5 4" stroke="#7a6a52" strokeWidth="1.5" strokeLinecap="round" />
          <polyline points="4,4 4,9 9,9" stroke="#7a6a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {iconBtn(onClear, "Clear board",
        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
          <polyline points="4,6 16,6" stroke="#b85c2a" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 6V4h4v2" stroke="#b85c2a" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="5" y="6" width="10" height="10" rx="1.5" stroke="#b85c2a" strokeWidth="1.3" />
        </svg>,
        true
      )}

      {iconBtn(onExport, "Download",
        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
          <path d="M10 3v9m0 0l-3-3m3 3l3-3" stroke="#7a6a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 14v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" stroke="#7a6a52" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}