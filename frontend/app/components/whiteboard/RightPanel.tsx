"use client";

import React, { useRef } from "react";
import { Tool, Background } from "./Toolbar";
import VoiceChat from "./VoiceChat";

interface RightPanelProps {
  userColor: string; userName: string; partnerColor: string; partnerName: string;
  partnerConnected: boolean; activeTool: Tool; activeColor: string; strokeSize: number;
  activeBackground: Background; onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void; onStrokeSizeChange: (size: number) => void;
  onBackgroundChange: (bg: Background) => void; onReaction: (emoji: string) => void;
  onImageUpload: (file: File) => void; roomCode: string; socket: any;
}

const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: "line", label: "Line", icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><line x1="3" y1="19" x2="19" y2="3" stroke="#5c4d37" strokeWidth="2" strokeLinecap="round" /></svg> },
  { id: "rectangle", label: "Rect", icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="3" y="5" width="16" height="12" rx="1.5" stroke="#5c4d37" strokeWidth="1.8" /></svg> },
  { id: "circle", label: "Circle", icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><circle cx="11" cy="11" r="7.5" stroke="#5c4d37" strokeWidth="1.8" /></svg> },
  { id: "text", label: "Text", icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><path d="M4 5h14M11 5v12" stroke="#5c4d37" strokeWidth="1.8" strokeLinecap="round" /><path d="M7 17h8" stroke="#5c4d37" strokeWidth="1.8" strokeLinecap="round" /></svg> },
  { id: "sticky", label: "Sticky", icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><path d="M4 4h14v10l-4 4H4z" fill="#f0e060" stroke="#c4a820" strokeWidth="1.5" strokeLinejoin="round" /></svg> },
  { id: "laser", label: "Laser", icon: <svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="9" y="3" width="4" height="10" rx="2" fill="#c04040" stroke="#8a2020" strokeWidth="1.2" /><circle cx="11" cy="19" r="2" fill="#ff4040" opacity="0.85" /></svg> },
];

const colors = ["#2d1f0a", "#b85c2a", "#e8a020", "#5a8a5a", "#3a5a8a", "#8a3a8a"];
const strokeSizes = [2, 4, 6, 10, 16];
const reactions = ["😀", "😂", "🤔", "😮", "👍", "👎"];

export default function RightPanel({
  userColor, userName, partnerColor, partnerName, partnerConnected,
  activeTool, activeColor, strokeSize, activeBackground,
  onToolChange, onColorChange, onStrokeSizeChange, onBackgroundChange,
  onReaction, onImageUpload, roomCode, socket,
}: RightPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sectionLabel = (text: string) => (
    <div style={{ fontFamily: "'Caveat', cursive", fontSize: 11, letterSpacing: "2px", color: "#7a6a52", textTransform: "uppercase", marginBottom: 8 }}>
      {text}
    </div>
  );

  const divider = () => <div style={{ height: 1, borderBottom: "1px dashed #c4b898", margin: "10px 0" }} />;

  return (
    <div style={{
      width: 200, flexShrink: 0, display: "flex", flexDirection: "column",
      backgroundColor: "#e8e0cc", borderLeft: "2px solid #c4b898",
      overflowY: "auto", padding: "12px 14px",
    }}>
      {sectionLabel("Collaborators")}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: userColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Caveat', cursive", fontSize: 13, color: "#fff", flexShrink: 0 }}>
            {userName[0]?.toUpperCase()}
          </div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: "#3d2f1a", flex: 1 }}>{userName}</div>
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: 10, backgroundColor: "#e8c87a", color: "#5c3d0a", padding: "1px 6px" }}>You</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: partnerConnected ? 1 : 0.5 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: partnerConnected ? partnerColor : "#a89878", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Caveat', cursive", fontSize: 13, color: "#fff", flexShrink: 0 }}>
            {partnerConnected ? partnerName[0]?.toUpperCase() : "?"}
          </div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: "#3d2f1a" }}>
            {partnerConnected ? partnerName : "Waiting..."}
          </div>
        </div>
      </div>

      {divider()}

      <VoiceChat
        roomCode={roomCode}
        username={userName}
        partnerConnected={partnerConnected}
        partnerName={partnerName}
        socket={socket}
      />

      {divider()}

      {sectionLabel("Whiteboard")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            style={{
              backgroundColor: activeTool === tool.id ? "#faf7f0" : "#faf7f0",
              border: activeTool === tool.id ? "2px solid #b85c2a" : "1.5px solid #c4b898",
              borderRadius: 3, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "6px 4px", gap: 3, cursor: "pointer",
            }}
          >
            {tool.icon}
            <span style={{ fontFamily: "'Caveat', cursive", fontSize: 10, color: "#5c4d37" }}>{tool.label}</span>
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ backgroundColor: "#faf7f0", border: "1.5px solid #c4b898", borderRadius: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 4px", gap: 3, cursor: "pointer" }}
        >
          <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
            <rect x="2" y="4" width="18" height="14" rx="2" stroke="#5c4d37" strokeWidth="1.6" fill="none" />
            <circle cx="7.5" cy="8.5" r="2" fill="#e8c87a" stroke="#c4a820" strokeWidth="1" />
            <path d="M2 15l5-5 4 4 3-3 6 5" stroke="#5c4d37" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: 10, color: "#5c4d37" }}>Image</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (file) onImageUpload(file); }} />
      </div>

      {divider()}

      {sectionLabel("Color")}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              width: 20, height: 20, borderRadius: "50%", backgroundColor: color,
              border: activeColor === color ? "2px solid #3d2f1a" : "2px solid transparent",
              cursor: "pointer", padding: 0,
              transform: activeColor === color ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}
        <input type="color" value={activeColor} onChange={(e) => onColorChange(e.target.value)}
          style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #c4b898", cursor: "pointer", padding: 0 }} />
      </div>

      {divider()}

      {sectionLabel("Stroke")}
      <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 10 }}>
        {strokeSizes.map((size) => (
          <button
            key={size}
            onClick={() => onStrokeSizeChange(size)}
            style={{
              flex: 1, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer", borderRadius: 2,
              backgroundColor: strokeSize === size ? "#faf7f0" : "transparent",
              outline: strokeSize === size ? "2px solid #b85c2a" : "none",
            }}
          >
            <div style={{ width: Math.min(size + 4, 16), height: size, backgroundColor: strokeSize === size ? "#b85c2a" : "#7a6a52", borderRadius: size }} />
          </button>
        ))}
      </div>

      {divider()}

      {sectionLabel("Reactions")}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        {reactions.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReaction(emoji)}
            style={{ fontSize: 18, background: "none", border: "1px solid #c4b898", cursor: "pointer", padding: "2px 4px", borderRadius: 2 }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}