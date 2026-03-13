"use client";

import React, { useState } from "react";
import Button from "@/app/components/ui/Button";

interface AIMessage {
  type: "auto_check" | "review" | "stuck" | "error" | "thinking";
  message: string;
  check_number?: number;
  timestamp: Date;
}

interface AIPanelProps {
  messages: AIMessage[];
  stuckVotes: number;
  onRequestReview: () => void;
  onVoteStuck: () => void;
  hasVotedStuck: boolean;
  checksRemaining: number;
}

export default function AIPanel({
  messages,
  stuckVotes,
  onRequestReview,
  onVoteStuck,
  hasVotedStuck,
  checksRemaining,
}: AIPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const getMessageStyle = (type: string) => {
    switch (type) {
      case "auto_check":
        return "border-l-4 border-amber-400 bg-amber-50 text-amber-900";
      case "review":
        return "border-l-4 border-blue-400 bg-blue-50 text-blue-900";
      case "stuck":
        return "border-l-4 border-violet-400 bg-violet-50 text-violet-900";
      case "error":
        return "border-l-4 border-red-400 bg-red-50 text-red-900";
      case "thinking":
        return "border-l-4 border-gray-300 bg-gray-50 text-gray-500 animate-pulse";
      default:
        return "border-l-4 border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  const getMessageLabel = (type: string, check_number?: number) => {
    switch (type) {
      case "auto_check":
        return `Auto check ${check_number || ""} of 4`;
      case "review":
        return "Work review";
      case "stuck":
        return "Hint";
      case "error":
        return "Error";
      case "thinking":
        return "Tutor is thinking...";
      default:
        return "Tutor";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-72">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-sm font-medium text-gray-800">AI Tutor</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">{checksRemaining} auto checks left</span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              {isOpen
                ? <path d="M19 13H5v-2h14v2z" />
                : <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              }
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-violet-400">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  The AI tutor is watching your board. Auto checks happen every 5 minutes.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`rounded-xl p-3 text-sm leading-relaxed ${getMessageStyle(msg.type)}`}
                >
                  <p className="text-xs font-medium opacity-70 mb-1">
                    {getMessageLabel(msg.type, msg.check_number)}
                  </p>
                  <p>{msg.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-200 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={onRequestReview}
            >
              Review our work
            </Button>

            <Button
              variant={hasVotedStuck ? "ghost" : "primary"}
              size="sm"
              className="w-full"
              onClick={onVoteStuck}
              disabled={hasVotedStuck}
            >
              {hasVotedStuck
                ? `We are stuck (${stuckVotes}/2 voted)`
                : "We are stuck"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}