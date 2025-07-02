"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 focus:outline-none ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <div
        className={`bg-yellow-400 w-4 h-4 rounded-full shadow-md transform duration-300 ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}
