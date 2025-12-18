"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
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

  const [activeStartDate, setActiveStartDate] = useState<Date>(() => new Date());

  const visibleRange = useMemo(() => {
    const monthStart = startOfMonth(activeStartDate);
    const monthEnd = endOfMonth(activeStartDate);
    const from = startOfWeek(monthStart, { weekStartsOn: 1 });
    const to = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return {
      from,
      to,
      fromStr: format(from, "yyyy-MM-dd"),
      toStr: format(to, "yyyy-MM-dd"),
    };
  }, [activeStartDate]);

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams({
        from: visibleRange.fromStr,
        to: visibleRange.toStr,
        mode: "calendar",
        limit: "1000",
      });
      const res = await fetch(`/api/employees/${employeeId}/leave-requests?${params.toString()}`);
      const data = await res.json();
      setLeaveRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load leave data.");
    }
  }, [employeeId, visibleRange.fromStr, visibleRange.toStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const leaveByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();

    for (const lr of leaveRequests) {
      const start = new Date(lr.startDate);
      const end = new Date(lr.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const cur = new Date(Math.max(start.getTime(), visibleRange.from.getTime()));
      const last = new Date(Math.min(end.getTime(), visibleRange.to.getTime()));
      cur.setHours(0, 0, 0, 0);
      last.setHours(0, 0, 0, 0);

      for (let d = new Date(cur); d <= last; d = addDays(d, 1)) {
        const key = format(d, "yyyy-MM-dd");
        const existing = map.get(key);
        if (existing) existing.push(lr);
        else map.set(key, [lr]);
      }
    }

    return map;
  }, [leaveRequests, visibleRange.from, visibleRange.to]);

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const leaves = leaveByDate.get(dateStr);
    const leave = leaves?.[0];

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
      <Calendar
        tileContent={tileContent}
        className="mx-auto border-none"
        onActiveStartDateChange={({ activeStartDate: next }) => {
          if (next) setActiveStartDate(next);
        }}
      />
    </Card>
  );
}
