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

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/leave-request?status=APPROVED");
        const data = await res.json();

        if (data.success) {
          const mappedEvents = data.data.map((req: any) => ({
            id: req.id,
            title: `${req.type} - ${req.employee.user.name}`,
            start: req.startDate,
            end: req.endDate,
            allDay: true,
          }));
          setEvents(mappedEvents);
        } else {
          toast.error(data.error || "Failed to load calendar events");
        }
      } catch (error) {
        console.error(error);
        toast.error("Error loading calendar events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <PageShell title="Calendar">
      <Card title="Company Calendar">
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
