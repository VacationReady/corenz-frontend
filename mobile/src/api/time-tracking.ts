import { apiClient } from './client';

export interface ClockInRequest {
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  photoUrl?: string;
  notes?: string;
}

export interface ClockOutRequest {
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  photoUrl?: string;
  notes?: string;
}

export interface ClockStatus {
  isClockedIn: boolean;
  activeEntry: any;
  duration?: {
    hours: number;
    minutes: number;
    totalMinutes: number;
  };
}

/**
 * Get current clock in/out status
 */
export async function getClockStatus(): Promise<ClockStatus> {
  const response = await apiClient.get('/api/time-tracking/status');
  return response.data;
}

/**
 * Clock in
 */
export async function clockIn(data: ClockInRequest) {
  const response = await apiClient.post('/api/time-tracking/clock-in', data);
  return response.data;
}

/**
 * Clock out
 */
export async function clockOut(data: ClockOutRequest) {
  const response = await apiClient.post('/api/time-tracking/clock-out', data);
  return response.data;
}

/**
 * Get timesheet entries for a date range
 */
export async function getTimesheetEntries(startDate: string, endDate: string) {
  const response = await apiClient.get(
    `/api/time-tracking/entries?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
}

/**
 * Get timesheet summary
 */
export async function getTimesheetSummary() {
  const response = await apiClient.get('/api/time-tracking/summary');
  return response.data;
}
