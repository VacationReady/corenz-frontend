import { useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';

export interface ShiftRecord {
  id: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  notes?: string | null;
  role?: string | null;
  attendanceStatus: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  isPublished: boolean;
  requiresConfirmation: boolean;
  confirmedAt?: string | null;
  cost?: number | null;
  employee?: {
    id: string;
    User: {
      name: string;
      email?: string;
      profileImageUrl?: string | null;
    };
    Department?: { id?: string; name?: string } | null;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  location?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
}

export interface ShiftSummary {
  totalCost: number;
  scheduledHours: number;
  overtimeHours: number;
  publishedCount: number;
  unpublishedCount: number;
}

export interface ShiftDepartmentBreakdownEntry {
  departmentId: string;
  departmentName: string;
  cost: number;
  hours: number;
  employeeCount: number;
  shiftCount: number;
}

interface ApiResponse {
  shifts: ShiftRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: ShiftSummary;
  departmentBreakdown: ShiftDepartmentBreakdownEntry[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error('Failed to fetch shifts');
    (error as any).status = response.status;
    throw error;
  }

  return response.json() as Promise<ApiResponse>;
};

interface UsePaginatedShiftsParams {
  startDate: Date;
  endDate: Date;
  departmentId?: string;
  employeeId?: string;
  isPublished?: 'all' | 'true' | 'false';
  pageSize?: number;
}

export function usePaginatedShifts({
  startDate,
  endDate,
  departmentId,
  employeeId,
  isPublished = 'all',
  pageSize = 50,
}: UsePaginatedShiftsParams) {
  const baseQuery = useMemo(() => {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (departmentId) {
      params.append('departmentId', departmentId);
    }

    if (employeeId) {
      params.append('employeeId', employeeId);
    }

    if (isPublished !== 'all') {
      params.append('isPublished', isPublished);
    }

    return params.toString();
  }, [startDate, endDate, departmentId, employeeId, isPublished]);

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<ApiResponse>(
    (pageIndex, previousPageData) => {
      if (!baseQuery) return null;
      if (previousPageData && !previousPageData.pagination.hasMore) {
        return null;
      }

      const params = new URLSearchParams(baseQuery);
      params.append('page', String(pageIndex + 1));
      params.append('pageSize', String(pageSize));
      return `/api/shifts?${params.toString()}`;
    },
    fetcher,
    {
      keepPreviousData: true,
      revalidateFirstPage: false,
    }
  );

  const flattenedShifts = useMemo(
    () => data?.flatMap(page => page.shifts) ?? [],
    [data]
  );

  const summary = data?.[0]?.summary;
  const departmentBreakdown = data?.[0]?.departmentBreakdown ?? [];
  const pagination = data?.[data.length - 1]?.pagination;

  const hasMore = Boolean(pagination?.hasMore);
  const isLoadingMore = isValidating && size > 0;
  const isEmpty = !isLoading && flattenedShifts.length === 0;

  return {
    shifts: flattenedShifts,
    summary,
    departmentBreakdown,
    pagination,
    error,
    isLoading,
    isLoadingMore,
    isEmpty,
    hasMore,
    size,
    setSize,
    refresh: () => mutate(undefined, { revalidate: true }),
  };
}

export type UsePaginatedShiftsReturn = ReturnType<typeof usePaginatedShifts>;
