"use client";

import React, { useState } from "react";

interface Problem {
  id: string;
  subject: string;
  title: string;
  description: string;
  difficulty: string;
}

interface ProblemPanelProps {
  problem: Problem | null;
  sessionTimer: number;
  partnerConnected: boolean;
  partnerName: string;
  partnerColor: string;
  userName: string;
  userColor: string;
}

export default function ProblemPanel({
  problem,
  sessionTimer,
  partnerConnected,
  partnerName,
  partnerColor,
  userName,
  userColor,
}: ProblemPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-700";
      case "medium": return "bg-amber-100 text-amber-700";
      case "hard": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const timeColor = sessionTimer < 120
    ? "text-red-500"
    : sessionTimer < 300
    ? "text-amber-500"
    : "text-gray-700";

  return (
    <div className="flex flex-col bg-white border-r border-gray-200 w-72">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-800">Problem</span>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-mono font-medium ${timeColor}`}>
            {formatTime(sessionTimer)}
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              {isCollapsed
                ? <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                : <path d="M19 13H5v-2h14v2z" />
              }
            </svg>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: userColor }}
              />
              <span className="text-xs text-gray-600">{userName} (you)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${partnerConnected ? "" : "opacity-40"}`}
                style={{ backgroundColor: partnerColor }}
              />
              <span className={`text-xs ${partnerConnected ? "text-gray-600" : "text-gray-400"}`}>
                {partnerConnected ? partnerName : "Waiting for partner..."}
              </span>
              {partnerConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto" />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {problem ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-gray-900 leading-snug">
                    {problem.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getDifficultyStyle(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  {problem.subject}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {problem.description}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24">
                <p className="text-sm text-gray-400">No problem loaded</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}