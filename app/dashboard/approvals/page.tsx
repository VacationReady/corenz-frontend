'use client';

import { useEffect, useState } from 'react';

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leave-request?status=PENDING')
      .then((res) => res.json())
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const handleDecision = async (id: string, status: 'APPROVED' | 'DECLINED') => {
    const res = await fetch(`/api/leave-request/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } else {
      alert('Failed to update request');
    }
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Leave Requests</h1>
      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p>No pending leave requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="border p-4 rounded shadow bg-white">
              <p><strong>{req.type}</strong> from <strong>{new Date(req.startDate).toLocaleDateString()}</strong> to <strong>{new Date(req.endDate).toLocaleDateString()}</strong></p>
              <p>Reason: {req.reason || 'N/A'}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleDecision(req.id, 'APPROVED')} className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700">Approve</button>
                <button onClick={() => handleDecision(req.id, 'DECLINED')} className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700">Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
