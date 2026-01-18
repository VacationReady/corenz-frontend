import { apiClient } from './client';

export interface ReconciliationEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  profileImageUrl: string | null;
  date: string;
  shiftId: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  clockEntryId: string | null;
  clockInTime: string | null;
  clockOutTime: string | null;
  timesheetEntryId: string | null;
  hours: number;
  variance: {
    startVarianceMinutes: number | null;
    endVarianceMinutes: number | null;
    totalVarianceMinutes: number | null;
  };
  status: 'PENDING' | 'MATCHED' | 'ADJUSTED' | 'FLAGGED' | 'APPROVED';
  flags: string[];
  notes: string | null;
}

export interface ReconciliationStats {
  totalEntries: number;
  pendingCount: number;
  matchedCount: number;
  flaggedCount: number;
  approvedCount: number;
  totalHours: number;
  varianceHours: number;
}

export interface DayReconciliationResponse {
  date: string;
  entries: ReconciliationEntry[];
  stats: ReconciliationStats;
  unmatchedClockEntries: UnmatchedClockEntry[];
  unmatchedShifts: UnmatchedShift[];
}

export interface UnmatchedClockEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  clockInTime: string;
  clockOutTime: string | null;
  hours: number;
}

export interface UnmatchedShift {
  id: string;
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  role: string | null;
}

export async function getReconciliationStats(
  startDate: Date,
  endDate: Date
): Promise<ReconciliationStats> {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const response = await apiClient.get(`/api/reconciliation/stats?${params}`);
  return response.data.stats;
}

export async function getDayReconciliation(date: Date): Promise<DayReconciliationResponse> {
  const dateStr = date.toISOString().split('T')[0];
  const response = await apiClient.get(`/api/reconciliation/day/${dateStr}`);
  return response.data;
}

export async function bulkApproveEntries(entryIds: string[]): Promise<void> {
  await apiClient.post('/api/reconciliation/bulk-approve', {
    entryIds,
  });
}

export async function editClockEntry(
  clockEntryId: string,
  data: {
    clockInTime?: string;
    clockOutTime?: string;
    notes?: string;
  }
): Promise<void> {
  await apiClient.post('/api/reconciliation/edit-clock-entry', {
    clockEntryId,
    ...data,
  });
}

export async function adjustEntry(
  timesheetEntryId: string,
  data: {
    hours?: number;
    notes?: string;
    reconciliationStatus?: string;
  }
): Promise<void> {
  await apiClient.post('/api/reconciliation/adjust', {
    timesheetEntryId,
    ...data,
  });
}

export async function flagEntry(
  timesheetEntryId: string,
  reason: string
): Promise<void> {
  await apiClient.post('/api/reconciliation/flag', {
    timesheetEntryId,
    reason,
  });
}

export async function matchClockToShift(
  clockEntryId: string,
  shiftId: string
): Promise<void> {
  await apiClient.post('/api/reconciliation/match', {
    clockEntryId,
    shiftId,
  });
}
