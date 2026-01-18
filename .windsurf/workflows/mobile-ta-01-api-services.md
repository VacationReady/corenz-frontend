---
description: Mobile T&A Phase 1 - Create API Service Layer for Shifts, Swaps, Timesheets
---

# Phase 1: Mobile API Service Layer

## Objective

Create the foundational API service layer that wraps backend endpoints for use throughout the mobile app. These services handle authentication, error handling, and provide typed interfaces.

## Prerequisites

- Review existing `mobile/src/api/time-tracking.ts` for patterns
- Review existing `mobile/src/services/OfflineClockService.ts` for offline patterns
- Ensure mobile authentication is working (`getMobileSession`)

## Files to Create

### 1. `mobile/src/api/shifts.ts`

Create the shifts API client:

```typescript
// mobile/src/api/shifts.ts
import apiClient from './client';

export interface Shift {
  id: string;
  employeeId: string;
  companyId: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  notes: string | null;
  role: string | null;
  departmentId: string | null;
  locationId: string | null;
  isPublished: boolean;
  isVirtualShift?: boolean;
  attendanceStatus: 'PENDING' | 'CONFIRMED' | 'NO_SHOW' | 'LATE' | 'EARLY_LEAVE';
  employee?: {
    id: string;
    User: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      profileImageUrl: string | null;
    };
  };
  department?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
  };
}

export interface ShiftsResponse {
  shifts: Shift[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: {
    totalCost: number;
    scheduledHours: number;
    overtimeHours: number;
    publishedCount: number;
    unpublishedCount: number;
  };
}

export async function getMyShifts(
  startDate: Date,
  endDate: Date
): Promise<ShiftsResponse> {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  
  const response = await apiClient.get(`/api/shifts?${params}`);
  return response.data;
}

export async function getShiftById(shiftId: string): Promise<Shift> {
  const response = await apiClient.get(`/api/shifts/${shiftId}`);
  return response.data.shift;
}

export async function getTodayShifts(): Promise<Shift[]> {
  const response = await apiClient.get('/api/shifts/today');
  return response.data.shifts || [];
}

export async function getWeekShifts(weekStartDate: Date): Promise<ShiftsResponse> {
  const endDate = new Date(weekStartDate);
  endDate.setDate(endDate.getDate() + 6);
  return getMyShifts(weekStartDate, endDate);
}
```

### 2. `mobile/src/api/swaps.ts`

Create the shift swaps API client:

```typescript
// mobile/src/api/swaps.ts
import apiClient from './client';

export interface ShiftSwapRequest {
  id: string;
  shiftId: string;
  requesterId: string;
  targetEmployeeId: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'MANAGER_PENDING' | 'APPROVED' | 'COMPLETED';
  requestMessage: string | null;
  responseMessage: string | null;
  managerApprovalRequired: boolean;
  createdAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  Shift: {
    id: string;
    startTime: string;
    endTime: string;
    role: string | null;
  };
  Requester: {
    id: string;
    User: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      profileImageUrl: string | null;
    };
  };
  TargetEmployee?: {
    id: string;
    User: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      profileImageUrl: string | null;
    };
  };
}

export interface SwapsResponse {
  swapRequests: ShiftSwapRequest[];
  total: number;
}

export async function getMySwapRequests(): Promise<SwapsResponse> {
  const response = await apiClient.get('/api/shift-swaps');
  return response.data;
}

export async function getIncomingSwaps(): Promise<ShiftSwapRequest[]> {
  const response = await apiClient.get('/api/shift-swaps?type=incoming');
  return response.data.swapRequests || [];
}

export async function getOutgoingSwaps(): Promise<ShiftSwapRequest[]> {
  const response = await apiClient.get('/api/shift-swaps?type=outgoing');
  return response.data.swapRequests || [];
}

export async function createSwapRequest(
  shiftId: string,
  targetEmployeeId?: string,
  requestMessage?: string
): Promise<ShiftSwapRequest> {
  const response = await apiClient.post('/api/shift-swaps', {
    shiftId,
    targetEmployeeId: targetEmployeeId || null,
    requestMessage: requestMessage || null,
  });
  return response.data.swapRequest;
}

export async function acceptSwap(swapId: string): Promise<void> {
  await apiClient.post(`/api/shift-swaps/${swapId}/accept`);
}

export async function rejectSwap(swapId: string, reason?: string): Promise<void> {
  await apiClient.post(`/api/shift-swaps/${swapId}/reject`, {
    reason: reason || null,
  });
}

export async function cancelSwap(swapId: string): Promise<void> {
  await apiClient.delete(`/api/shift-swaps/${swapId}`);
}

export async function getEligibleSwapTargets(shiftId: string): Promise<any[]> {
  const response = await apiClient.get(`/api/shift-swaps/eligible?shiftId=${shiftId}`);
  return response.data.employees || [];
}
```

### 3. `mobile/src/api/timesheets.ts`

Create the timesheets API client:

```typescript
// mobile/src/api/timesheets.ts
import apiClient from './client';

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
  
  const response = await apiClient.get(`/api/timesheets?${params}`);
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
```

### 4. `mobile/src/api/reconciliation.ts`

Create the admin reconciliation API client:

```typescript
// mobile/src/api/reconciliation.ts
import apiClient from './client';

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
  unmatchedClockEntries: any[];
  unmatchedShifts: any[];
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
```

### 5. `mobile/src/services/ShiftService.ts`

Create the shift service with caching and offline support:

```typescript
// mobile/src/services/ShiftService.ts
import * as shiftsApi from '../api/shifts';
import { OfflineStorage } from './OfflineStorage';
import { format, startOfWeek, endOfWeek, isToday, isTomorrow, parseISO } from 'date-fns';

const SHIFTS_CACHE_KEY = 'cached_shifts';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedShifts {
  shifts: shiftsApi.Shift[];
  cachedAt: number;
  weekStart: string;
}

export class ShiftService {
  private static instance: ShiftService;
  
  static getInstance(): ShiftService {
    if (!ShiftService.instance) {
      ShiftService.instance = new ShiftService();
    }
    return ShiftService.instance;
  }

  async getWeekShifts(weekStartDate?: Date): Promise<shiftsApi.Shift[]> {
    const weekStart = weekStartDate || startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    // Check cache first
    const cached = await this.getCachedShifts(weekKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await shiftsApi.getMyShifts(weekStart, weekEnd);
      await this.cacheShifts(response.shifts, weekKey);
      return response.shifts;
    } catch (error) {
      // Return cached data if available, even if stale
      const staleCache = await this.getCachedShifts(weekKey, true);
      if (staleCache) {
        console.log('[ShiftService] Using stale cache due to network error');
        return staleCache;
      }
      throw error;
    }
  }

  async getTodayShift(): Promise<shiftsApi.Shift | null> {
    const shifts = await this.getWeekShifts();
    return shifts.find(s => isToday(parseISO(s.startTime))) || null;
  }

  async getTomorrowShift(): Promise<shiftsApi.Shift | null> {
    const shifts = await this.getWeekShifts();
    return shifts.find(s => isTomorrow(parseISO(s.startTime))) || null;
  }

  async getUpcomingShifts(limit: number = 5): Promise<shiftsApi.Shift[]> {
    const shifts = await this.getWeekShifts();
    const now = new Date();
    return shifts
      .filter(s => parseISO(s.startTime) >= now)
      .slice(0, limit);
  }

  async refreshShifts(): Promise<shiftsApi.Shift[]> {
    // Force refresh by clearing cache
    await OfflineStorage.remove(SHIFTS_CACHE_KEY);
    return this.getWeekShifts();
  }

  private async getCachedShifts(
    weekKey: string,
    ignoreExpiry: boolean = false
  ): Promise<shiftsApi.Shift[] | null> {
    try {
      const cached = await OfflineStorage.get<CachedShifts>(SHIFTS_CACHE_KEY);
      if (!cached || cached.weekStart !== weekKey) {
        return null;
      }
      
      const isExpired = Date.now() - cached.cachedAt > CACHE_DURATION_MS;
      if (isExpired && !ignoreExpiry) {
        return null;
      }
      
      return cached.shifts;
    } catch {
      return null;
    }
  }

  private async cacheShifts(shifts: shiftsApi.Shift[], weekKey: string): Promise<void> {
    const cacheData: CachedShifts = {
      shifts,
      cachedAt: Date.now(),
      weekStart: weekKey,
    };
    await OfflineStorage.set(SHIFTS_CACHE_KEY, cacheData);
  }
}

export const shiftService = ShiftService.getInstance();
```

### 6. `mobile/src/services/SwapService.ts`

Create the swap service:

```typescript
// mobile/src/services/SwapService.ts
import * as swapsApi from '../api/swaps';

export class SwapService {
  private static instance: SwapService;
  
  static getInstance(): SwapService {
    if (!SwapService.instance) {
      SwapService.instance = new SwapService();
    }
    return SwapService.instance;
  }

  async getMySwaps(): Promise<{
    incoming: swapsApi.ShiftSwapRequest[];
    outgoing: swapsApi.ShiftSwapRequest[];
  }> {
    const [incoming, outgoing] = await Promise.all([
      swapsApi.getIncomingSwaps(),
      swapsApi.getOutgoingSwaps(),
    ]);
    return { incoming, outgoing };
  }

  async getPendingIncomingCount(): Promise<number> {
    const incoming = await swapsApi.getIncomingSwaps();
    return incoming.filter(s => s.status === 'PENDING').length;
  }

  async requestSwap(
    shiftId: string,
    targetEmployeeId?: string,
    message?: string
  ): Promise<swapsApi.ShiftSwapRequest> {
    return swapsApi.createSwapRequest(shiftId, targetEmployeeId, message);
  }

  async acceptSwap(swapId: string): Promise<void> {
    return swapsApi.acceptSwap(swapId);
  }

  async rejectSwap(swapId: string, reason?: string): Promise<void> {
    return swapsApi.rejectSwap(swapId, reason);
  }

  async cancelSwap(swapId: string): Promise<void> {
    return swapsApi.cancelSwap(swapId);
  }

  async getEligibleTargets(shiftId: string): Promise<any[]> {
    return swapsApi.getEligibleSwapTargets(shiftId);
  }
}

export const swapService = SwapService.getInstance();
```

### 7. `mobile/src/services/TimesheetService.ts`

Create the timesheet service:

```typescript
// mobile/src/services/TimesheetService.ts
import * as timesheetsApi from '../api/timesheets';
import { OfflineStorage } from './OfflineStorage';
import { format, startOfWeek, endOfWeek } from 'date-fns';

const TIMESHEETS_CACHE_KEY = 'cached_timesheets';

export class TimesheetService {
  private static instance: TimesheetService;
  
  static getInstance(): TimesheetService {
    if (!TimesheetService.instance) {
      TimesheetService.instance = new TimesheetService();
    }
    return TimesheetService.instance;
  }

  async getMyTimesheets(): Promise<timesheetsApi.Timesheet[]> {
    try {
      const response = await timesheetsApi.getMyTimesheets();
      await this.cacheTimesheets(response.timesheets);
      return response.timesheets;
    } catch (error) {
      // Return cached if network fails
      const cached = await this.getCachedTimesheets();
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  async getCurrentWeekTimesheet(): Promise<timesheetsApi.Timesheet | null> {
    return timesheetsApi.getCurrentWeekTimesheet();
  }

  async getTimesheetWithEntries(
    timesheetId: string
  ): Promise<{
    timesheet: timesheetsApi.Timesheet;
    entries: timesheetsApi.TimesheetEntry[];
  }> {
    const [timesheet, entries] = await Promise.all([
      timesheetsApi.getTimesheetById(timesheetId),
      timesheetsApi.getTimesheetEntries(timesheetId),
    ]);
    return { timesheet, entries };
  }

  async submitTimesheet(timesheetId: string): Promise<void> {
    return timesheetsApi.submitTimesheet(timesheetId);
  }

  async updateEntryNotes(entryId: string, notes: string): Promise<void> {
    await timesheetsApi.updateEntryNotes(entryId, notes);
  }

  async getTimesheetSummary(timesheetId: string): Promise<{
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    daysWorked: number;
    entriesCount: number;
  }> {
    const { timesheet, entries } = await this.getTimesheetWithEntries(timesheetId);
    
    const uniqueDays = new Set(entries.map(e => e.date.split('T')[0]));
    
    return {
      totalHours: timesheet.totalHours || 0,
      regularHours: timesheet.regularHours || 0,
      overtimeHours: timesheet.overtimeHours || 0,
      daysWorked: uniqueDays.size,
      entriesCount: entries.length,
    };
  }

  private async getCachedTimesheets(): Promise<timesheetsApi.Timesheet[] | null> {
    try {
      return await OfflineStorage.get<timesheetsApi.Timesheet[]>(TIMESHEETS_CACHE_KEY);
    } catch {
      return null;
    }
  }

  private async cacheTimesheets(timesheets: timesheetsApi.Timesheet[]): Promise<void> {
    await OfflineStorage.set(TIMESHEETS_CACHE_KEY, timesheets);
  }
}

export const timesheetService = TimesheetService.getInstance();
```

## Verification Steps

After creating all files:

1. **Type Check**
   ```bash
   cd mobile
   npx tsc --noEmit
   ```

2. **Import Test** - Create a test file to verify imports:
   ```typescript
   // mobile/src/api/__tests__/imports.test.ts
   import * as shifts from '../shifts';
   import * as swaps from '../swaps';
   import * as timesheets from '../timesheets';
   import * as reconciliation from '../reconciliation';
   import { shiftService } from '../../services/ShiftService';
   import { swapService } from '../../services/SwapService';
   import { timesheetService } from '../../services/TimesheetService';
   
   describe('API imports', () => {
     it('should export shift functions', () => {
       expect(shifts.getMyShifts).toBeDefined();
       expect(shifts.getTodayShifts).toBeDefined();
     });
     
     it('should export swap functions', () => {
       expect(swaps.createSwapRequest).toBeDefined();
       expect(swaps.acceptSwap).toBeDefined();
     });
     
     it('should export timesheet functions', () => {
       expect(timesheets.getMyTimesheets).toBeDefined();
       expect(timesheets.submitTimesheet).toBeDefined();
     });
     
     it('should export services', () => {
       expect(shiftService).toBeDefined();
       expect(swapService).toBeDefined();
       expect(timesheetService).toBeDefined();
     });
   });
   ```

3. **Verify API Client Exists** - Ensure `mobile/src/api/client.ts` exists with proper auth headers

## Notes

- All API functions use the existing `apiClient` from `mobile/src/api/client.ts`
- Services are singletons for consistent caching
- Offline fallback uses `OfflineStorage` from existing services
- Date handling uses `date-fns` (already in dependencies)

## Next Step

Proceed to `mobile-ta-02-dashboard-tiles.md` to create the dashboard UI components.
