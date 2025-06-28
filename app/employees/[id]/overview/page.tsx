"use client";

import { useEffect, useState } from "react";
import LeaveCalendar from "./LeaveCalendar";
import EditEntitlementModal from "./EditEntitlementModal";
import { Button, Card } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function EmployeeOverview({ params }: { params: { id: string } }) {
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const fetchEmployee = async () => {
        try {
            const res = await fetch(`/api/employees/${params.id}`);
            if (!res.ok) throw new Error("Employee not found");
            const data = await res.json();
            setEmployee(data);
        } catch (error) {
            console.error("Error fetching employee:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployee();
    }, []);

    if (loading) return <p className="p-4">Loading...</p>;
    if (!employee) return <p className="p-4 text-red-500">Employee not found</p>;

    const { user, leaveEntitlement } = employee;

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-4">
            {/* Employee Profile */}
            <Card className="p-4">
                <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phone}</p>
                <p><strong>Department:</strong> {user.department?.name || "N/A"}</p>
                <p><strong>Job Role:</strong> {user.jobRole?.name || "N/A"}</p>
            </Card>

            {/* Leave Entitlement Section */}
            <Card className="p-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Leave Entitlements</h3>
                    <Button onClick={() => setShowModal(true)}>Edit Entitlement</Button>
                </div>
                <ul className="mt-2 space-y-1">
                    <li>Annual Leave: {leaveEntitlement?.annualLeave ?? 20} days</li>
                    <li>Sick Leave: {leaveEntitlement?.sickLeave ?? 10} days</li>
                    <li>Bereavement Leave: {leaveEntitlement?.bereavement ?? 3} days</li>
                </ul>
            </Card>

            {/* Leave Calendar */}
            <Card className="p-4">
                <LeaveCalendar employeeId={employee.id} />
            </Card>

            <EditEntitlementModal
                open={showModal}
                setOpen={setShowModal}
                employeeId={employee.id}
                currentEntitlement={leaveEntitlement}
                refresh={fetchEmployee}
            />
        </div>
    );
}
