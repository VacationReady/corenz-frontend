import { apiClient } from './client';

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
    mobile: 'true',
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
