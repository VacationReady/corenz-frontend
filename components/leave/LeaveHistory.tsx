"use client";

import { useEffect, useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function LeaveHistory() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");

  const fetchRequests = () => {
    fetch("/api/leave-request")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load leave requests");
        return res.json();
      })
      .then((data) => setRequests(data))
      .catch(() => setError("Failed to load leave requests"));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Your Leave History</SectionHeading>
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : requests.length === 0 ? (
          <p className="italic text-gray-500">No leave requests found.</p>
        ) : (
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
                  <td className="p-2 border">
                    {new Date(req.startDate).toLocaleDateString()}
                  </td>
                  <td className="p-2 border">
                    {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-1 rounded text-white text-sm ${
                        req.status === "APPROVED"
                          ? "bg-green-600"
                          : req.status === "DECLINED"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

