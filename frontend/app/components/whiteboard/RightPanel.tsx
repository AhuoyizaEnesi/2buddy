"use client";

import React, { useRef } from "react";
import { Tool, Background } from "./Toolbar";

interface RightPanelProps {
  userColor: string;
  userName: string;
  partnerColor: string;
  partnerName: string;
  partnerConnected: boolean;
  activeTool: Tool;
  activeColor: string;
  strokeSize: number;
  activeBackground: Background;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeSizeChange: (size: number) => void;
  onBackgroundChange: (bg: Background) => void;
  onReaction: (emoji: string) => void;
  onImageUpload: (file: File) => void;
}

const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
  {
    id: "pen", label: "Pen",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
  },
  {
    id: "eraser", label: "Eraser",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.78-.78 2.05 0 2.83L5.03 20H8l9.73-9.73a2 2 0 000-2.83l-1.18-1.18V3h-1.41zM6.21 19l-1.8-1.8 5.37-5.37 1.8 1.8L6.21 19zM20 19h-8v2h8v-2z" /></svg>
  },
  {
    id: "line", label: "Line",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z" /></svg>
  },
  {
    id: "rectangle", label: "Rectangle",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="1" /></svg>
  },
  {
    id: "circle", label: "Circle",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>
  },
  {
    id: "text", label: "Text",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4z" /></svg>
  },
  {
    id: "sticky", label: "Sticky Note",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg>
  },
  {
    id: "laser", label: "Laser",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  },
];

const colors = ["#1a1a1a", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
const strokeSizes = [2, 4, 6, 10, 16];
const reactions = ["😀", "😂", "🤔", "😮", "👍", "👎"];

const backgrounds: { id: Background; label: string }[] = [
  { id: "white", label: "W" },
  { id: "dots", label: "D" },
  { id: "grid", label: "G" },
  { id: "lined", label: "L" },
  { id: "isometric", label: "I" },
  { id: "chalkboard", label: "C" },
];

const bgColors: Record<Background, string> = {
  white: "#ffffff",
  dots: "#f0f9ff",
  grid: "#f0fdf4",
  lined: "#fefce8",
  isometric: "#faf5ff",
  chalkboard: "#1a3a2a",
};

export default function RightPanel({
  userColor,
  userName,
  partnerColor,
  partnerName,
  partnerConnected,
  activeTool,
  activeColor,
  strokeSize,
  activeBackground,
  onToolChange,
  onColorChange,
  onStrokeSizeChange,
  onBackgroundChange,
  onReaction,
  onImageUpload,
}: RightPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sectionTitle = (title: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
      {title}
    </div>
  );

  const divider = () => (
    <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "12px 0" }} />
  );

  return (
    <div style={{
      width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
      backgroundColor: "#ffffff", borderLeft: "1px solid #e5e7eb",
      overflowY: "auto", padding: "16px",
    }}>
      {sectionTitle("Collaboration & Tools")}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", backgroundColor: "#f0f9ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: userColor }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1e40af", flex: 1 }}>
            USER 1: {userName}
          </span>
          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>You</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", backgroundColor: partnerConnected ? "#f0fdf4" : "#f9fafb", borderRadius: 8, border: `1px solid ${partnerConnected ? "#bbf7d0" : "#e5e7eb"}` }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: partnerConnected ? partnerColor : "#d1d5db" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: partnerConnected ? "#166534" : "#9ca3af", flex: 1 }}>
            USER 2: {partnerConnected ? partnerName : "Waiting..."}
          </span>
          {partnerConnected && (
            <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Active</span>
          )}
        </div>
      </div>

      {divider()}

      {sectionTitle("Whiteboard Tools")}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer",
              backgroundColor: activeTool === tool.id ? "#2563eb" : "#f3f4f6",
              color: activeTool === tool.id ? "#ffffff" : "#374151",
              gap: 3,
            }}
          >
            {tool.icon}
            <span style={{ fontSize: 9, fontWeight: 500 }}>{tool.label}</span>
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Image Upload"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer",
            backgroundColor: "#f3f4f6", color: "#374151", gap: 3,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 500 }}>Image</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageUpload(file);
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>Color</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              style={{
                width: 22, height: 22, borderRadius: "50%", border: activeColor === color ? "2px solid #2563eb" : "2px solid #e5e7eb",
                backgroundColor: color, cursor: "pointer", padding: 0,
                transform: activeColor === color ? "scale(1.2)" : "scale(1)", transition: "all 0.15s",
              }}
            />
          ))}
          <input
            type="color"
            value={activeColor}
            onChange={(e) => onColorChange(e.target.value)}
            style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #e5e7eb", cursor: "pointer", padding: 0 }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>Stroke size</div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {strokeSizes.map((size) => (
            <button
              key={size}
              onClick={() => onStrokeSizeChange(size)}
              style={{
                flex: 1, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 6, border: "none", cursor: "pointer",
                backgroundColor: strokeSize === size ? "#eff6ff" : "#f3f4f6",
              }}
            >
              <div style={{ width: Math.min(size + 6, 20), height: size, borderRadius: size, backgroundColor: strokeSize === size ? "#2563eb" : "#9ca3af" }} />
            </button>
          ))}
        </div>
      </div>

      {divider()}

      {sectionTitle("Reaction System")}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {reactions.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReaction(emoji)}
            style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "2px", borderRadius: 6, transition: "transform 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {divider()}

      {sectionTitle("Backgrounds")}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {backgrounds.map((bg) => (
          <button
            key={bg.id}
            onClick={() => onBackgroundChange(bg.id)}
            title={bg.id}
            style={{
              width: 32, height: 32, borderRadius: 6,
              border: activeBackground === bg.id ? "2px solid #2563eb" : "2px solid #e5e7eb",
              backgroundColor: bgColors[bg.id],
              cursor: "pointer", fontSize: 9, fontWeight: 700,
              color: bg.id === "chalkboard" ? "#ffffff" : "#374151",
            }}
          >
            {bg.label}
          </button>
        ))}
      </div>
    </div>
  );
}