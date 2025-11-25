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
  if (startDate) params.append('from', startDate);
  if (endDate) params.append('to', endDate);
  const suffix = params.toString();

  const response = await apiFetch(`/api/calendar-events${suffix ? `?${suffix}` : ''}`, {                                                                        
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch calendar events');
  }

  const data = await response.json();
  // Server returns direct array
  return Array.isArray(data) ? data : [];
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(): Promise<CalendarEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return getCalendarEvents(today, nextMonth);
}
