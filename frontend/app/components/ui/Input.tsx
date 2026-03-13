import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all
          focus:ring-2 focus:ring-violet-500 focus:border-transparent
          ${error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}