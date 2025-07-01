"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface Department {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchEvents = async (department?: string) => {
    try {
      const res = await fetch(
        `/api/calendar-events${department ? `?department=${encodeURIComponent(department)}` : ""}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch calendar events");
      }
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error(error);
      toast.error("Error loading calendar events");
    } finally {
      setLoading(false);
    }
  };

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
    fetchEvents();
  }, []);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDepartment(value);
    setLoading(true);
    fetchEvents(value);
  };

  return (
    <PageShell title="Calendar">
      <Card title="Company Calendar">
        <div className="p-4">
          <label className="block mb-2 font-medium">
            Filter by Department:
          </label>
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
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={events}
              height="auto"
            />
          )}
        </div>
      </Card>
    </PageShell>
  );
}
