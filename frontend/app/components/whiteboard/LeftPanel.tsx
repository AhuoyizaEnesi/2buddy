"use client";

import React, { useState } from "react";

interface Problem {
  id: string; subject: string; title: string; description: string; difficulty: string;
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
  onCheckAnswer: () => void;
  hasVotedStuck: boolean;
  stuckVotes: number;
  checksRemaining: number;
  canvasRef: any;
  partnerVotedStuck: boolean;
}

export default function LeftPanel({
  problem, sessionTimer, aiMessages, onRequestReview, onVoteStuck, onCheckAnswer,
  hasVotedStuck, stuckVotes, checksRemaining, canvasRef, partnerVotedStuck,
}: LeftPanelProps) {
  const [previewVisible, setPreviewVisible] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const timeColor = sessionTimer < 120 ? "#991b1b" : sessionTimer < 300 ? "#b85c2a" : "#2d1f0a";

  const getDifficultyStyle = (d: string) => {
    if (d === "easy") return { bg: "#dcfce7", text: "#166534" };
    if (d === "hard") return { bg: "#fee2e2", text: "#991b1b" };
    return { bg: "#e8c87a", text: "#5c3d0a" };
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case "auto_check": return { borderColor: "#b85c2a", bg: "#fdf3ec", label: "AUTO CHECK" };
      case "review": return { borderColor: "#3a5a8a", bg: "#eef2f8", label: "REVIEW" };
      case "stuck": return { borderColor: "#7a5a8a", bg: "#f5f0f8", label: "HINT" };
      case "error": return { borderColor: "#991b1b", bg: "#fef2f2", label: "ERROR" };
      default: return { borderColor: "#a89878", bg: "#f5f0e8", label: "THINKING" };
    }
  };

  const sectionLabel = (text: string) => (
    <div style={{ fontFamily: "'Caveat', cursive", fontSize: 11, letterSpacing: "2px", color: "#7a6a52", textTransform: "uppercase", marginBottom: 8 }}>
      {text}
    </div>
  );

  return (
    <div style={{
      width: 280, flexShrink: 0, display: "flex", flexDirection: "column",
      backgroundColor: "#e8e0cc", borderRight: "2px solid #c4b898", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #c4b898" }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700, color: "#3d2f1a" }}>
          2<span style={{ color: "#b85c2a" }}>Buddy</span>
        </div>
        {problem && (
          <div style={{ display: "inline-block", fontFamily: "'Caveat', cursive", fontSize: 13, backgroundColor: "#b85c2a", color: "#fdf8f0", padding: "2px 10px", marginTop: 4, transform: "rotate(-1deg)" }}>
            {problem.subject.charAt(0).toUpperCase() + problem.subject.slice(1)}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 16px", borderBottom: "1px dashed #c4b898" }}>
        {sectionLabel("Problem")}
        {problem ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {(() => {
                const dc = getDifficultyStyle(problem.difficulty);
                return (
                  <span style={{ fontFamily: "'Caveat', cursive", fontSize: 12, backgroundColor: dc.bg, color: dc.text, padding: "1px 8px" }}>
                    {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                  </span>
                );
              })()}
            </div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700, color: "#2d1f0a", marginBottom: 6 }}>
              {problem.title}
            </div>
            <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: "#5c4d37", lineHeight: 1.7, margin: 0 }}>
              {problem.description}
            </p>
          </div>
        ) : (
          <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: "#7a6a52" }}>No problem loaded</p>
        )}
      </div>

      <div style={{ padding: "10px 16px", borderBottom: "1px dashed #c4b898" }}>
        <button
          onClick={() => setPreviewVisible(!previewVisible)}
          style={{
            width: "100%", padding: "6px 0", backgroundColor: "#faf7f0",
            border: "1px solid #c4b898", fontFamily: "'Caveat', cursive",
            fontSize: 13, color: "#3d2f1a", cursor: "pointer", borderRadius: 0,
          }}
        >
          {previewVisible ? "Hide preview" : "Show board preview"}
        </button>
        {previewVisible && (
          <div style={{ marginTop: 8, overflow: "hidden", border: "1px solid #c4b898", height: 100, backgroundColor: "#faf7f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={canvasRef.current?.getDataUrl() || ""} alt="Board preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        )}
      </div>

      <div style={{ padding: "14px 16px", borderBottom: "1px dashed #c4b898", textAlign: "center" }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 11, letterSpacing: "2px", color: "#7a6a52", textTransform: "uppercase", marginBottom: 2 }}>
          Time remaining
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 36, color: timeColor, lineHeight: 1 }}>
          {formatTime(sessionTimer)}
        </div>
      </div>

      <div style={{ padding: "14px 16px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {sectionLabel("AI Tutor")}

        <div style={{ flex: 1, overflowY: "auto", marginBottom: 10, minHeight: 0 }}>
          {aiMessages.length === 0 ? (
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: "#5c4d37", lineHeight: 1.7, fontStyle: "italic" }}>
              Need a hint? Press STUCK together or REVIEW for full feedback.
              <br /><br />
              <span style={{ fontFamily: "'Caveat', cursive", color: "#b85c2a", fontStyle: "normal" }}>
                {checksRemaining} auto-checks left
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aiMessages.map((msg, i) => {
                const style = getMessageStyle(msg.type);
                return (
                  <div key={i} style={{ borderLeft: `3px solid ${style.borderColor}`, backgroundColor: style.bg, padding: "8px 10px", fontFamily: "'Crimson Pro', serif", fontSize: 12, color: "#5c4d37", lineHeight: 1.6 }}>
                    <div style={{ fontFamily: "'Caveat', cursive", fontSize: 10, fontWeight: 700, color: style.borderColor, marginBottom: 3, letterSpacing: "0.06em" }}>
                      {style.label}{msg.type === "auto_check" && ` ${msg.check_number}/4`}
                    </div>
                    {msg.message}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {partnerVotedStuck && !hasVotedStuck && (
          <div style={{ marginBottom: 8, padding: "8px 10px", backgroundColor: "#fef9c3", border: "1px solid #c4a820", fontFamily: "'Crimson Pro', serif", fontSize: 12, color: "#854d0e" }}>
            Your partner voted stuck — vote too to get a hint!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={onRequestReview} style={{ padding: "8px 0", backgroundColor: "#faf7f0", border: "1.5px solid #c4b898", fontFamily: "'Caveat', cursive", fontSize: 14, color: "#3d2f1a", cursor: "pointer", borderRadius: 0 }}>
            Review our work
          </button>
          <button onClick={onCheckAnswer} style={{ padding: "8px 0", backgroundColor: "#b85c2a", border: "none", fontFamily: "'Caveat', cursive", fontSize: 14, color: "#fdf8f0", cursor: "pointer", borderRadius: 0 }}>
            ✓ Check answer
          </button>
          <button
            onClick={onVoteStuck}
            disabled={hasVotedStuck}
            style={{
              padding: "8px 0",
              backgroundColor: hasVotedStuck ? "#c4b898" : "#2d1f0a",
              border: "none", fontFamily: "'Caveat', cursive", fontSize: 14,
              color: hasVotedStuck ? "#7a6a52" : "#fdf8f0",
              cursor: hasVotedStuck ? "not-allowed" : "pointer", borderRadius: 0,
            }}
          >
            {hasVotedStuck ? `We are stuck (${stuckVotes}/2 voted)` : "We are stuck"}
          </button>
        </div>
      </div>
    </div>
  );
}