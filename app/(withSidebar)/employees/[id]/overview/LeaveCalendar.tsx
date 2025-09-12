"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { format } from "date-fns";

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  type: "ANNUAL" | "SICK" | "BEREAVEMENT";
  status: "PENDING" | "APPROVED" | "DECLINED";
  reason?: string;
};

export default function LeaveCalendar({ employeeId }: { employeeId: string }) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/employees/${employeeId}/leave-requests`);
        const data = await res.json();
        setLeaveRequests(data);
      } catch (err) {
        setError("Failed to load leave data.");
      }
    };
    fetchData();
  }, [employeeId]);

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const leave = leaveRequests.find(
      (lr) =>
        dateStr >= lr.startDate.slice(0, 10) &&
        dateStr <= lr.endDate.slice(0, 10),
    );

    if (leave) {
      return (
        <div
          className={`rounded-full w-2 h-2 mx-auto mt-1 ${
            leave.type === "ANNUAL"
              ? "bg-green-500"
              : leave.type === "SICK"
                ? "bg-yellow-500"
                : "bg-purple-500"
          }`}
          title={`${leave.type} (${leave.status})`}
        ></div>
      );
    }
    return null;
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Leave Calendar</h2>
        <Button size="sm">Book Leave</Button>{" "}
        {/* Wire modal for future phase */}
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <Calendar tileContent={tileContent} className="mx-auto border-none" />
      <p className="text-xs mt-2 text-center">
        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>{" "}
        Annual Leave
        <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full ml-4 mr-1"></span>{" "}
        Sick Leave
        <span className="inline-block w-3 h-3 bg-purple-500 rounded-full ml-4 mr-1"></span>{" "}
        Bereavement Leave
      </p>
    </Card>
  );
}
