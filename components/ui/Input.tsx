import React from "react";

export default function Input({
  placeholder = "Search...",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="bg-neutral-800 text-white placeholder-gray-400 px-4 py-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
      placeholder={placeholder}
      {...props}
    />
  );
}
