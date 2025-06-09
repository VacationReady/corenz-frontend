'use client';

import { useEffect, useState } from 'react';

export default function LeaveHistory() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leave-request')
      .then((res) => res.json())
      .then((data) => setRequests(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  if (requests.length === 0) {
    return <p className="text-sm text-gray-500">You haven’t submitted any leave requests yet.</p>;
  }

  return (
    <ul className="text-sm text-gray-700 space-y-1">
      {requests.map((req) => (
        <li key={req.id} className="border-b pb-1">
          <strong>{req.type}</strong>: {new Date(req.startDate).toLocaleDateString()} → {new Date(req.endDate).toLocaleDateString()}
          <span className={`ml-2 px-2 py-1 text-xs rounded ${
            req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
            req.status === 'DECLINED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {req.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
