"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await fetch(`/api/employees/${id}`);
        if (!res.ok) throw new Error("Employee not found");
        const data = await res.json();
        setEmployee(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!employee) return null;

  return (
    <div className="flex min-h-screen">
      {/* Profile-specific sidebar */}
      <aside className="w-64 bg-white shadow-md p-4 space-y-4">
        <h2 className="text-xl font-bold mb-4">Employee Menu</h2>
        <ul className="space-y-2">
          <li><Link href="#">Overview</Link></li>
          <li><Link href="#">Leave Requests</Link></li>
          <li><Link href="#">Documents</Link></li>
          <li><Link href="#">Performance</Link></li>
          <li><Link href="#">Settings</Link></li>
        </ul>
      </aside>

      {/* Main profile content */}
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">{employee.firstName} {employee.lastName}</h1>
        <p><strong>Email:</strong> {employee.email}</p>
        <p><strong>Phone:</strong> {employee.phone}</p>
        <p><strong>Department:</strong> {employee.department}</p>
        <p><strong>Job Role:</strong> {employee.jobRole}</p>
      </main>
    </div>
  );
}
