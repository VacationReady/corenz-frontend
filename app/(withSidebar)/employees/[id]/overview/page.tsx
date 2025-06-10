"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ClientLayout from "@/components/ClientLayout";

export default function EmployeeProfilePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Missing employee ID.");
      setLoading(false);
      return;
    }

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

  return (
    <ClientLayout>
      <div className="p-6">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : employee ? (
          <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">
              {employee.firstName} {employee.lastName}
            </h1>
            <div className="space-y-2">
              <p><strong>Email:</strong> {employee.email}</p>
              <p><strong>Phone:</strong> {employee.phone || "-"}</p>
              <p><strong>Department:</strong> {employee.department || "-"}</p>
              <p><strong>Job Role:</strong> {employee.jobRole || "-"}</p>
            </div>
          </div>
        ) : null}
      </div>
    </ClientLayout>
  );
}
