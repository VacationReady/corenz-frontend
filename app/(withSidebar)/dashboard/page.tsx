"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";

export default function DashboardPage() {
  // Your dashboard logic here, e.g., fetching and displaying data.
  return (
    <div className="w-full px-6 pt-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome to your dashboard!</p>
    </div>
  );
}
