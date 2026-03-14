"use client";

import React, { useState } from "react";

interface Problem {
  id: string;
  subject: string;
  title: string;
  description: string;
  difficulty: string;
}

interface AIMessage {
  type: "auto_check" | "review" | "stuck" | "error" | "thinking";
  message: string;
  check_number?: number;
  timestamp: Date;
}

interface LeftPanelProps {
  problem: Problem | null;
  sessionTimer: number;
  aiMessages: AIMessage[];
  onRequestReview: () => void;
  onVoteStuck: () => void;
  hasVotedStuck: boolean;
  stuckVotes: number;
  checksRemaining: number;
  canvasRef: any;
}

export default function LeftPanel({
  problem,
  sessionTimer,
  aiMessages,
  onRequestReview,
  onVoteStuck,
  hasVotedStuck,
  stuckVotes,
  checksRemaining,
  canvasRef,
}: LeftPanelProps) {
  const [previewVisible, setPreviewVisible] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const timeColor = sessionTimer < 120 ? "#ef4444" : sessionTimer < 300 ? "#f97316" : "#1e3a5f";

  const getDifficultyColor = (d: string) => {
    if (d === "easy") return { bg: "#dcfce7", text: "#166534" };
    if (d === "hard") return { bg: "#fee2e2", text: "#991b1b" };
    return { bg: "#fef9c3", text: "#854d0e" };
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case "auto_check": return { borderColor: "#f97316", bg: "#fff7ed" };
      case "review": return { borderColor: "#3b82f6", bg: "#eff6ff" };
      case "stuck": return { borderColor: "#8b5cf6", bg: "#f5f3ff" };
      case "error": return { borderColor: "#ef4444", bg: "#fef2f2" };
      default: return { borderColor: "#d1d5db", bg: "#f9fafb" };
    }
  };

  const lastMessage = aiMessages[aiMessages.length - 1];

  return (
    <div style={{
      width: 280, flexShrink: 0, display: "flex", flexDirection: "column",
      backgroundColor: "#ffffff", borderRight: "1px solid #e5e7eb",
      overflow: "hidden",
    }}>
      <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Problem Panel
        </div>

        {problem ? (
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              Subject: <span style={{ fontWeight: 600, color: "#1e3a5f" }}>{problem.subject.charAt(0).toUpperCase() + problem.subject.slice(1)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>{problem.title}</span>
              {(() => {
                const dc = getDifficultyColor(problem.difficulty);
                return (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, backgroundColor: dc.bg, color: dc.text }}>
                    {problem.difficulty}
                  </span>
                );
              })()}
            </div>
            <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, margin: 0 }}>
              {problem.description}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#9ca3af" }}>No problem loaded</p>
        )}
      </div>

      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
        <button
          onClick={() => setPreviewVisible(!previewVisible)}
          style={{ width: "100%", padding: "6px 0", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151", cursor: "pointer", fontWeight: 500 }}
        >
          {previewVisible ? "Hide preview" : "Show board preview"}
        </button>
        {previewVisible && (
          <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", height: 120, backgroundColor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={canvasRef.current?.getDataUrl() || ""}
              alt="Board preview"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        )}
      </div>

      <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Time Remaining
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: timeColor, fontFamily: "monospace", letterSpacing: "0.05em" }}>
          {formatTime(sessionTimer)}
        </div>
      </div>

      <div style={{ padding: "16px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          AI Tutor
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: 10, minHeight: 0 }}>
          {aiMessages.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>
              AI TUTOR: Need a hint? Press STUCK together or REVIEW for full feedback.
              <br /><br />
              <span style={{ color: "#d97706" }}>*Auto check pending* ({checksRemaining} checks left)</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aiMessages.map((msg, i) => {
                const style = getMessageStyle(msg.type);
                return (
                  <div key={i} style={{
                    borderLeft: `3px solid ${style.borderColor}`,
                    backgroundColor: style.bg,
                    borderRadius: "0 8px 8px 0",
                    padding: "8px 10px",
                    fontSize: 12,
                    color: "#374151",
                    lineHeight: 1.6,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: style.borderColor, marginBottom: 3, textTransform: "uppercase" }}>
                      {msg.type === "thinking" ? "Thinking..." : msg.type === "auto_check" ? `Check ${msg.check_number}/4` : msg.type}
                    </div>
                    {msg.message}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={onRequestReview}
            style={{
              padding: "8px 0", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#1d4ed8", cursor: "pointer",
            }}
          >
            Review our work
          </button>
          <button
            onClick={onVoteStuck}
            disabled={hasVotedStuck}
            style={{
              padding: "8px 0",
              backgroundColor: hasVotedStuck ? "#f3f4f6" : "#1e3a5f",
              border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: hasVotedStuck ? "#9ca3af" : "#ffffff", cursor: hasVotedStuck ? "not-allowed" : "pointer",
            }}
          >
            {hasVotedStuck ? `We are stuck (${stuckVotes}/2 voted)` : "We are stuck"}
          </button>
        </div>
      </div>
    </div>
  );
}