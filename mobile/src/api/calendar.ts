const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  type: string;
  categoryId?: string;
  isRecurring: boolean;
  attendees?: any[];
  createdAt: string;
  category?: {
    name: string;
    color: string;
  };
}

/**
 * Get calendar events
 */
export async function getCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(
    `${API_BASE_URL}/api/calendar-events?${params.toString()}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch calendar events');
  }

  return response.json();
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(): Promise<CalendarEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return getCalendarEvents(today, nextMonth);
}
