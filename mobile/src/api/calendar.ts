import { apiFetch } from './client';

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
  const suffix = params.toString();

  const response = await apiFetch(`/api/calendar-events${suffix ? `?${suffix}` : ''}`, {
    method: 'GET',
  });

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
