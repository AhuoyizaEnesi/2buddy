"use client";

import React from "react";

export type Tool = "pen" | "eraser" | "rectangle" | "circle" | "line" | "text";

interface ToolbarProps {
  activeTool: Tool;
  activeColor: string;
  strokeSize: number;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeSizeChange: (size: number) => void;
  onClear: () => void;
  onUndo: () => void;
}

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: "pen", label: "Pen", icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" },
  { id: "eraser", label: "Eraser", icon: "M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83zM3 17.25V21h3.75l8.06-8.06-3.75-3.75L3 17.25z" },
  { id: "line", label: "Line", icon: "M19 13H5v-2h14v2z" },
  { id: "rectangle", label: "Rectangle", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" },
  { id: "circle", label: "Circle", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" },
  { id: "text", label: "Text", icon: "M5 4v3h5.5v12h3V7H19V4z" },
];

const colors = [
  "#1a1a1a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
];

const strokeSizes = [2, 4, 6, 10, 16];

export default function Toolbar({
  activeTool,
  activeColor,
  strokeSize,
  onToolChange,
  onColorChange,
  onStrokeSizeChange,
  onClear,
  onUndo,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-4 bg-white border border-gray-200 rounded-2xl p-3 shadow-lg w-14 items-center py-4">
      <div className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => onToolChange(tool.id)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all
              ${activeTool === tool.id
                ? "bg-violet-100 text-violet-700 shadow-sm"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d={tool.icon} />
            </svg>
          </button>
        ))}
      </div>

      <div className="w-8 border-t border-gray-200" />

      <div className="flex flex-col gap-1.5 items-center">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110
              ${activeColor === color ? "border-violet-500 scale-110" : "border-gray-300"}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <input
          type="color"
          value={activeColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-gray-300"
          title="Custom color"
        />
      </div>

      <div className="w-8 border-t border-gray-200" />

      <div className="flex flex-col gap-1.5 items-center">
        {strokeSizes.map((size) => (
          <button
            key={size}
            onClick={() => onStrokeSizeChange(size)}
            title={`${size}px`}
            className={`flex items-center justify-center w-9 h-7 rounded-lg transition-all
              ${strokeSize === size
                ? "bg-violet-100"
                : "hover:bg-gray-100"
              }`}
          >
            <div
              className="rounded-full bg-gray-700"
              style={{ width: Math.min(size + 8, 28), height: size }}
            />
          </button>
        ))}
      </div>

      <div className="w-8 border-t border-gray-200" />

      <button
        onClick={onUndo}
        title="Undo"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
        </svg>
      </button>

      <button
        onClick={onClear}
        title="Clear board"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
    </div>
  );
}