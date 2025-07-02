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
      style={{
        width: "50px",
        height: "24px",
        borderRadius: "12px",
        backgroundColor: checked ? "green" : "grey",
        position: "relative",
        border: "none",
        cursor: "pointer",
        padding: "0",
      }}
    >
      <div
        style={{
          height: "20px",
          width: "20px",
          borderRadius: "50%",
          backgroundColor: "white",
          position: "absolute",
          top: "2px",
          left: checked ? "26px" : "2px",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}
