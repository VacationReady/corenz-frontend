"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";
import BlockDayModal from "./BlockDayModal";

interface Department {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) {
        throw new Error("Failed to fetch departments");
      }
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error(error);
      toast.error("Error loading departments");
    }
  };

  useEffect(() => {
    fetchDepartments();
    setLoading(false);
  }, []);

  const fetchCalendarEvents = async (fetchInfo, successCallback, failureCallback) => {
    try {
      const [leaveRes, blackoutRes] = await Promise.all([
        fetch(`/api/calendar-events${selectedDepartment ? `?department=${encodeURIComponent(selectedDepartment)}` : ""}`),
        fetch("/api/event-rules/blackout/get")
      ]);

      if (!leaveRes.ok || !blackoutRes.ok) {
        throw new Error("Failed to fetch events or blackout dates");
      }

      const leaveData = await leaveRes.json();
      const blackoutData = await blackoutRes.json();

      successCallback([...leaveData, ...blackoutData]);
    } catch (error) {
      console.error(error);
      toast.error("Error loading calendar data");
      failureCallback(error);
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDepartment(value);
    calendarRef.current?.getApi().refetchEvents();
  };

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.date);
    setBlockModalOpen(true);
  };

  const refreshCalendar = () => {
    calendarRef.current?.getApi().refetchEvents();
  };

  return (
    <PageShell title="Calendar">
      <Card title="Company Calendar">
        <div className="p-4">
          <label className="block mb-2 font-medium">Filter by Department:</label>
          <select
            value={selectedDepartment}
            onChange={handleDepartmentChange}
            className="border rounded p-2 w-full md:w-64"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-4">Loading...</p>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={fetchCalendarEvents}
              dateClick={handleDateClick}
              height="auto"
            />
          )}
        </div>
      </Card>
      {selectedDate && (
        <BlockDayModal
          open={blockModalOpen}
          setOpen={setBlockModalOpen}
          selectedDate={selectedDate}
          refreshEvents={refreshCalendar}
        />
      )}
    </PageShell>
  );
}
