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
  
  // Transform API response (which returns 'shifts' as ShiftWithActuals[]) to match expected interface
  const { shifts = [], unmatchedClockEntries = [], ...rest } = response.data;
  
  // Map ShiftWithActuals to reconciliation entries
  // API returns: { shift: {..., employee: {...}}, clockEntry: {...}, timesheetEntry: {...}, variance: {...}, reconciliationStatus }
  const entries: ReconciliationEntry[] = shifts.map((item: any) => {
    // Handle both nested structure (shift.shift) and flat structure
    const shiftData = item.shift || item;
    const clockEntry = item.clockEntry;
    const timesheetEntry = item.timesheetEntry;
    const variance = item.variance || {};
    
    // Get employee info - handle nested User structure
    const employee = shiftData.employee;
    const user = employee?.User;
    
    // Build employee name with proper fallbacks
    let employeeName = 'Unassigned';
    if (user) {
      if (user.name) {
        employeeName = user.name;
      } else if (user.firstName || user.lastName) {
        employeeName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } else if (user.email) {
        employeeName = user.email.split('@')[0];
      }
    } else if (shiftData.employeeId) {
      employeeName = 'Employee';
    }
    
    // Calculate hours from shift times if not available from timesheet
    let hours = 0;
    if (timesheetEntry?.hours) {
      hours = parseFloat(timesheetEntry.hours);
    } else if (shiftData.startTime && shiftData.endTime) {
      const start = new Date(shiftData.startTime);
      const end = new Date(shiftData.endTime);
      const breakMinutes = shiftData.breakDuration || 0;
      hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60) - (breakMinutes / 60);
    }
    
    // Determine shift status for display
    const now = new Date();
    const shiftStart = shiftData.startTime ? new Date(shiftData.startTime) : null;
    const shiftEnd = shiftData.endTime ? new Date(shiftData.endTime) : null;
    
    let status: ReconciliationEntry['status'] = item.reconciliationStatus || 'PENDING';
    
    // Add context for shifts that haven't started yet
    const hasNotStarted = shiftStart && shiftStart > now;
    const isInProgress = shiftStart && shiftEnd && shiftStart <= now && shiftEnd > now;
    
    return {
      id: shiftData.id,
      employeeId: shiftData.employeeId || '',
      employeeName,
      employeeEmail: user?.email || null,
      profileImageUrl: user?.profileImageUrl || null,
      date: shiftData.startTime,
      shiftId: shiftData.id,
      shiftStart: shiftData.startTime,
      shiftEnd: shiftData.endTime,
      clockEntryId: clockEntry?.id || null,
      clockInTime: clockEntry?.clockInTime || null,
      clockOutTime: clockEntry?.clockOutTime || null,
      timesheetEntryId: timesheetEntry?.id || null,
      hours,
      variance: {
        startVarianceMinutes: variance.startVarianceMinutes ?? null,
        endVarianceMinutes: variance.endVarianceMinutes ?? null,
        totalVarianceMinutes: variance.minutes ?? null,
      },
      status,
      flags: [],
      notes: timesheetEntry?.reconciliationNotes || null,
      // Additional context for UI
      _hasNotStarted: hasNotStarted,
      _isInProgress: isInProgress,
      _varianceType: variance.type || null,
      _role: shiftData.role || null,
    } as ReconciliationEntry & { _hasNotStarted?: boolean; _isInProgress?: boolean; _varianceType?: string; _role?: string };
  });
  
  // Calculate stats from entries
  const completedEntries = entries.filter(e => !(e as any)._hasNotStarted);
  const stats: ReconciliationStats = {
    totalEntries: entries.length,
    pendingCount: completedEntries.filter(e => e.status === 'PENDING' || e.status === 'MATCHED').length,
    matchedCount: entries.filter(e => e.clockEntryId || e.timesheetEntryId).length,
    flaggedCount: entries.filter(e => e.status === 'FLAGGED').length,
    approvedCount: entries.filter(e => e.status === 'APPROVED').length,
    totalHours: entries.reduce((sum, e) => sum + (e.hours || 0), 0),
    varianceHours: entries.reduce((sum, e) => sum + Math.abs(e.variance.totalVarianceMinutes || 0) / 60, 0),
  };
  
  return {
    date: rest.date,
    entries,
    stats,
    unmatchedClockEntries: (unmatchedClockEntries || []).map((entry: any) => ({
      id: entry.id,
      employeeId: entry.employeeId,
      employeeName: entry.employee?.name || entry.employee?.User?.name || 
        `${entry.employee?.User?.firstName || ''} ${entry.employee?.User?.lastName || ''}`.trim() || 'Unknown',
      clockInTime: entry.clockInTime,
      clockOutTime: entry.clockOutTime,
      hours: entry.clockOutTime 
        ? (new Date(entry.clockOutTime).getTime() - new Date(entry.clockInTime).getTime()) / (1000 * 60 * 60)
        : 0,
    })),
    unmatchedShifts: [],
  };
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
