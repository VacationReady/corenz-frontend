"use client";

import { useEffect, useState } from "react";

export default function LeaveHistory() {
  const [requests, setRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("/api/leave-request");

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.error || "Failed to fetch leave requests");
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected response format");
        }

        setRequests(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      }
    };

    fetchRequests();
  }, []);

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  if (requests.length === 0) {
    return <p className="text-gray-500">No leave requests found.</p>;
  }

  return (
    <ul className="text-sm text-gray-700 space-y-2">
      {requests.map((req) => (
        <li key={req.id}>
          <strong>{req.type}</strong>: {req.startDate} to {req.endDate} –{" "}
          <em>{req.status}</em>
        </li>
      ))}
    </ul>
  );
}
