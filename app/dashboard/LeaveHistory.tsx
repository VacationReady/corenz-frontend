"use client";

import { useEffect, useState } from "react";

export default function LeaveHistory() {
  const [requests, setRequests] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/leave-request")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load leave requests");
        return res.json();
      })
      .then((data) => setRequests(data))
      .catch(() => setError("Failed to load leave requests"));
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (requests.length === 0) {
    return <p className="italic text-gray-500">No leave requests found.</p>;
  }

  return (
    <table className="min-w-full border border-gray-300 rounded shadow-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border text-left">Type</th>
          <th className="p-2 border text-left">Start Date</th>
          <th className="p-2 border text-left">End Date</th>
          <th className="p-2 border text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((req) => (
          <tr key={req.id} className="text-left">
            <td className="p-2 border">{req.type}</td>
            <td className="p-2 border">{new Date(req.startDate).toLocaleDateString()}</td>
            <td className="p-2 border">{new Date(req.endDate).toLocaleDateString()}</td>
            <td className="p-2 border">{req.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
