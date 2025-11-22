"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { format } from "date-fns";
import { getEventCategoryIcon } from "@/lib/event-category-icons";

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  EventCategory: {
    id: string;
    name: string;
    iconKey?: string | null;
  };
  approvalStatus: "PENDING" | "APPROVED" | "DECLINED";
  reason?: string;
};

export default function LeaveCalendar({ employeeId }: { employeeId: string }) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Increase limit to show full history/future in calendar
        const res = await fetch(`/api/employees/${employeeId}/leave-requests?limit=1000`);
        const data = await res.json();
        setLeaveRequests(Array.isArray(data) ? data : []);
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
      const Icon = getEventCategoryIcon(leave.EventCategory.iconKey);
      return (
        <div
          className="flex justify-center mt-1"
          title={`${leave.EventCategory.name} (${leave.approvalStatus})`}
        >
          <Icon className="w-3 h-3 text-primary" />
        </div>
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
    </Card>
  );
}
