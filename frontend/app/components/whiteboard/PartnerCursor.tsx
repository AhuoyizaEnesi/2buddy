"use client";

import React from "react";

interface PartnerCursorProps {
  x: number;
  y: number;
  color: string;
  username: string;
}

export default function PartnerCursor({
  x,
  y,
  color,
  username,
}: PartnerCursorProps) {
  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-75"
      style={{ left: x, top: y }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 2L16 10L10 11L8 17L4 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="absolute left-4 top-0 text-xs text-white px-1.5 py-0.5 rounded-md whitespace-nowrap font-medium"
        style={{ backgroundColor: color }}
      >
        {username}
      </div>
    </div>
  );
}