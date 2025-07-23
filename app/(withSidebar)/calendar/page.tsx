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
import { EventInput, EventSourceFuncArg } from "@fullcalendar/core";

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
  const [refreshTrigger, setRefreshTrigger] = useState(false); // 🚩 NEW: force re-render trigger
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

  const fetchCalendarEvents = async (
    fetchInfo: EventSourceFuncArg,
    successCallback: (events: EventInput[]) => void,
    failureCallback: (error: any) => void
  ) => {
    try {
      const [leaveRes, blackoutRes] = await Promise.all([
        fetch(`/api/calendar-events${selectedDepartment ? `?department=${encodeURIComponent(selectedDepartment)}` : ""}`),
        fetch("/api/blackout-days/get")
      ]);

      if (!leaveRes.ok || !blackoutRes.ok) {
        throw new Error("Failed to fetch events or blackout days");
      }

      const leaveData = await leaveRes.json();
      const blackoutData = await blackoutRes.json();

      const blackoutEvents = blackoutData.map((b: any) => ({
        id: b.id,
        title: b.allEvents ? "Blackout Day (All Events)" : "Blackout Day",
        start: b.date,
        allDay: true,
        backgroundColor: "#FF0000",
        borderColor: "#FF0000",
        extendedProps: {
          isBlackout: true,
        },
      }));

      successCallback([...leaveData, ...blackoutEvents]);
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

  const handleEventClick = async (clickInfo) => {
    if (clickInfo.event.extendedProps.isBlackout) {
      if (confirm("Delete this blackout day?")) {
        try {
          const res = await fetch("/api/blackout-days/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blackoutDayId: clickInfo.event.id }),
          });
          if (!res.ok) throw new Error("Failed to delete blackout day");
          toast.success("Blackout day deleted");
          refreshCalendar();
        } catch (error) {
          console.error(error);
          toast.error("Error deleting blackout day");
        }
      }
    }
  };

  const refreshCalendar = () => {
    console.log("🔄 Refreshing calendar events...");
    calendarRef.current?.getApi().refetchEvents();
    setRefreshTrigger((prev) => !prev); // 🚩 NEW: force re-render on refresh
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
    eventClick={handleEventClick}
    height="auto"
    key={refreshTrigger ? "refresh-on" : "refresh-off"} // 🚩 forces rerender on refresh
    timeZone="Europe/London" // 🚩 added for BST stability
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
