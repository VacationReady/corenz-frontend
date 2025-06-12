"use client";

import { useState } from "react";

export default function LeaveRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState({
    type: "ANNUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/leave-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert("Leave request submitted!");
      setForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
      setShowForm(false);
      if (onSuccess) onSuccess();
    } else {
      alert("Error submitting leave request.");
    }
    setSubmitting(false);
  };

  return (
    <div>
      <button
        className="inline-block mt-4 text-sm text-white bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 transition"
        onClick={() => setShowForm(!showForm)}
      >
        Book Holiday
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 bg-white p-4 rounded shadow border max-w-md">
          <div>
            <label>Leave Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="border p-2 w-full">
              <option value="ANNUAL">Annual</option>
              <option value="SICK">Sick</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARENTAL">Parental</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label>Start Date</label>
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="border p-2 w-full" />
          </div>

          <div>
            <label>End Date</label>
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="border p-2 w-full" />
          </div>

          <div>
            <label>Reason (optional)</label>
            <textarea name="reason" value={form.reason} onChange={handleChange} className="border p-2 w-full" />
          </div>

          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}
    </div>
  );
}
