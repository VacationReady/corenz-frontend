import { apiClient } from './client';

export interface TimesheetEntry {
  id: string;
  timesheetId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hours: number;
  regularHours: number;
  overtimeHours: number;
  overtimeMultiplier: number | null;
  overtimeType: string | null;
  isOvertime: boolean;
  isPublicHoliday: boolean;
  publicHolidayName: string | null;
  notes: string | null;
  entryType: 'CLOCK' | 'MANUAL' | 'SHIFT' | 'IMPORTED';
  reconciliationStatus: 'PENDING' | 'MATCHED' | 'ADJUSTED' | 'FLAGGED' | 'APPROVED';
  shiftId: string | null;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  notes: string | null;
  TimesheetEntries?: TimesheetEntry[];
  _count?: {
    TimesheetEntries: number;
  };
}

export interface TimesheetsResponse {
  timesheets: Timesheet[];
  total: number;
}

export async function getMyTimesheets(
  startDate?: Date,
  endDate?: Date
): Promise<TimesheetsResponse> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());

  const queryString = params.toString();
  const url = queryString ? `/api/timesheets?${queryString}` : '/api/timesheets';
  const response = await apiClient.get(url);
  return response.data;
}

export async function getTimesheetById(timesheetId: string): Promise<Timesheet> {
  const response = await apiClient.get(`/api/timesheets/${timesheetId}`);
  return response.data.timesheet;
}

export async function getTimesheetEntries(timesheetId: string): Promise<TimesheetEntry[]> {
  const response = await apiClient.get(`/api/timesheets/${timesheetId}/entries`);
  return response.data.entries || [];
}

export async function submitTimesheet(timesheetId: string): Promise<void> {
  await apiClient.post(`/api/timesheets/${timesheetId}/submit`);
}

export async function updateEntryNotes(
  entryId: string,
  notes: string
): Promise<TimesheetEntry> {
  const response = await apiClient.patch(`/api/timesheets/entries/${entryId}/notes`, {
    notes,
  });
  return response.data.entry;
}

export async function getCurrentWeekTimesheet(): Promise<Timesheet | null> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const response = await getMyTimesheets(weekStart, weekEnd);
  return response.timesheets[0] || null;
}
