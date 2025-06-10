"use client";
export const dynamic = "force-dynamic";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState } from "react";

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
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        dateClick={handleDateClick}
        events={events}
        height="auto"
      />
    </div>
  );
}
