"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import PageShell from "@/components/ui/PageShell";
import Card from "@/components/ui/Card";

export default function CalendarPage() {
  const [events, setEvents] = useState([
    { title: "Annual Leave - John", date: "2025-06-14" },
    { title: "Team Meeting", date: "2025-06-18" },
  ]);

  const handleDateClick = (arg: any) => {
    const title = prompt("Enter event title:");
    if (title) {
      setEvents([...events, { title, date: arg.dateStr }]);
    }
  };

  return (
    <PageShell title="Calendar">
      <Card title="Company Calendar">
        <div className="bg-white rounded-xl overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            dateClick={handleDateClick}
            events={events}
            height="auto"
          />
        </div>
      </Card>
    </PageShell>
  );
}
