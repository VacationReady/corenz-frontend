import React from "react";

export default function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 h-full">
      <div className="flex items-center mb-4 text-indigo-700">
        {icon && <div className="w-6 h-6 mr-2">{icon}</div>}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="text-sm text-gray-800 space-y-2">{children}</div>
    </div>
  );
}
