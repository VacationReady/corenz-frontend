import React from "react";

export default function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return <h2 className="text-lg font-semibold text-gray-800 mb-2">{children}</h2>;
}

