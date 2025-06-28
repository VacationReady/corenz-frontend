"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ClientLayout from "../../../ClientLayout";
import LeaveCalendar from "./LeaveCalendar";

export default function EmployeeProfilePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Missing User ID.");
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        const res = await fetch(`/api/employees/${id}`);
        if (!res.ok) throw new Error("Employee not found");
        const data = await res.json();

        // Data structure now aligned with 'user' nested inside employee
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
      <div className="p-6 space-y-6">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : employee && employee.user ? (
          <>
            <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold mb-4">
                {employee.user.firstName} {employee.user.lastName}
              </h1>
              <div className="space-y-2">
                <p><strong>Email:</strong> {employee.user.email}</p>
                <p><strong>Phone:</strong> {employee.user.phone || "-"}</p>
                <p><strong>Department:</strong> {employee.user.department?.name || "-"}</p>
                <p><strong>Job Role:</strong> {employee.user.jobRole?.name || "-"}</p>
              </div>
            </div>

            {/* ✅ Leave Calendar Section */}
            <div className="max-w-2xl mx-auto">
              {id && <LeaveCalendar employeeId={employee.id} />}
            </div>
          </>
        ) : null}
      </div>
    </ClientLayout>
  );
}
