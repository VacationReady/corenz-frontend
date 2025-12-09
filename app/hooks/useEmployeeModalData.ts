import useSWRImmutable from "swr/immutable";
import { useState, useCallback } from "react";

export interface Department {
  id: string;
  name: string;
}

export interface JobRole {
  id: string;
  name: string;
}

export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface ContractType {
  id: string;
  label: string;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  departments?: { id: string }[];
  jobRoles?: { id: string }[];
}

export interface WorkingPatternDay {
  type: string;
}

export interface WorkingPatternWeek {
  days: WorkingPatternDay[];
}

export interface WorkingPattern {
  id: string;
  name: string;
  patternType?: "STANDARD" | "SHIFT_BASED" | "FLEXIBLE" | "COMPRESSED";
  weeks: WorkingPatternWeek[];
}

export interface PermissionProfile {
  id: string;
  name: string;
}

export interface RotaGroup {
  id: string;
  name: string;
  description?: string;
  locationId?: string;
  departmentId?: string;
  Location?: { id: string; name: string };
  Department?: { id: string; name: string };
}

export interface DatasetState<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Creates a fetcher function with optional company ID header for tenant-scoped requests.
 * @param companyId - Optional company ID to include in request headers
 */
const createFetcher = (companyId?: string) => async (url: string) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Include x-company-id header if available for tenant-scoped endpoints
  if (companyId) {
    headers["x-company-id"] = companyId;
  }

  const response = await fetch(url, {
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message =
      errorPayload?.error ||
      errorPayload?.message ||
      `Failed to load data (${response.status})`;
    throw new Error(message);
  }
  return response.json();
};

/**
 * Shared hook for employee modal reference data with SWR caching.
 * Provides stale-while-revalidate semantics with granular error handling per dataset.
 * @param enabled - Whether to fetch data (default: true)
 * @param companyId - Optional company ID for tenant-scoped requests
 */
export function useEmployeeModalData(enabled: boolean = true, companyId?: string) {
  const fetcher = createFetcher(companyId);
  const [manualRevalidate, setManualRevalidate] = useState(0);

  // Departments
  const {
    data: departmentsData,
    error: departmentsError,
    isLoading: departmentsLoading,
    mutate: revalidateDepartments,
  } = useSWRImmutable<Department[] | { departments: Department[] }>(
    enabled ? `/api/departments?_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Job Roles
  const {
    data: jobRolesData,
    error: jobRolesError,
    isLoading: jobRolesLoading,
    mutate: revalidateJobRoles,
  } = useSWRImmutable<JobRole[] | { jobRoles: JobRole[] }>(
    enabled ? `/api/job-roles?_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Employees - fetch all for line manager dropdown (no pagination limit)
  // Use status=all to include all employees regardless of isActive status
  // This ensures system admins and other users appear in the manager dropdown
  const {
    data: employeesData,
    error: employeesError,
    isLoading: employeesLoading,
    mutate: revalidateEmployees,
  } = useSWRImmutable<{ data: EmployeeSummary[] } | EmployeeSummary[]>(
    enabled ? `/api/employees?limit=all&status=all&_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Locations
  const {
    data: locationsData,
    error: locationsError,
    isLoading: locationsLoading,
    mutate: revalidateLocations,
  } = useSWRImmutable<Location[]>(
    enabled ? `/api/locations?_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Contract Types
  const {
    data: contractTypesData,
    error: contractTypesError,
    isLoading: contractTypesLoading,
    mutate: revalidateContractTypes,
  } = useSWRImmutable<ContractType[]>(
    enabled ? `/api/contract-type-options?_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Onboarding Templates
  const {
    data: templatesData,
    error: templatesError,
    isLoading: templatesLoading,
    mutate: revalidateTemplates,
  } = useSWRImmutable<OnboardingTemplate[] | { templates: OnboardingTemplate[] }>(
    enabled ? `/api/onboarding/templates?_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Working Patterns
  const {
    data: workingPatternsData,
    error: workingPatternsError,
    isLoading: workingPatternsLoading,
    mutate: revalidateWorkingPatterns,
  } = useSWRImmutable<WorkingPattern[]>(
    enabled ? `/api/working-patterns?_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Permission Profiles (for admin access)
  const {
    data: permissionProfilesData,
    error: permissionProfilesError,
    isLoading: permissionProfilesLoading,
    mutate: revalidatePermissionProfiles,
  } = useSWRImmutable<PermissionProfile[]>(
    enabled ? `/api/permission-profiles?_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Rota Groups (for shift-based scheduling)
  const {
    data: rotaGroupsData,
    error: rotaGroupsError,
    isLoading: rotaGroupsLoading,
    mutate: revalidateRotaGroups,
  } = useSWRImmutable<{ rotaGroups: RotaGroup[] }>(
    enabled ? `/api/rota-groups?isActive=true&_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // Normalize data shapes (handle both array and { key: array } responses)
  const departments = Array.isArray(departmentsData)
    ? departmentsData
    : (departmentsData as any)?.departments || [];
  const jobRoles = Array.isArray(jobRolesData)
    ? jobRolesData
    : (jobRolesData as any)?.jobRoles || [];
  const employees = Array.isArray(employeesData)
    ? employeesData
    : (employeesData as any)?.data || [];
  const locations = Array.isArray(locationsData) ? locationsData : [];
  const contractTypes = Array.isArray(contractTypesData) ? contractTypesData : [];
  const templates = Array.isArray(templatesData)
    ? templatesData
    : (templatesData as any)?.templates || [];
  const workingPatterns = Array.isArray(workingPatternsData) ? workingPatternsData : [];
  const permissionProfiles = Array.isArray(permissionProfilesData) ? permissionProfilesData : [];
  const rotaGroups = (rotaGroupsData as any)?.rotaGroups || [];

  // Debug logging for employees data
  if (enabled && !employeesLoading && !employeesError) {
    console.log("[useEmployeeModalData] Employees loaded:", {
      rawDataType: typeof employeesData,
      isArray: Array.isArray(employeesData),
      hasDataProp: !!(employeesData as any)?.data,
      normalizedCount: employees.length,
      companyId,
    });
  }

  // Normalize templates
  const normalizedTemplates: OnboardingTemplate[] = templates.map((t: any) => ({
    id: t.id,
    name: t.name,
    departments: (t.departments || t.Department || []).map((d: any) => ({ id: d.id })),
    jobRoles: (t.jobRoles || t.JobRole || []).map((j: any) => ({ id: j.id })),
  }));

  // Retry handlers with error logging
  const retryAll = useCallback(() => {
    console.log("[useEmployeeModalData] Retrying all datasets");
    setManualRevalidate((v) => v + 1);
  }, []);

  // Check if any data is loading
  const isLoading =
    departmentsLoading ||
    jobRolesLoading ||
    employeesLoading ||
    locationsLoading ||
    contractTypesLoading ||
    templatesLoading ||
    workingPatternsLoading ||
    permissionProfilesLoading ||
    rotaGroupsLoading;

  // Check if all critical data has loaded (templates are required)
  const hasLoadedCriticalData = !templatesLoading && templates.length >= 0;

  return {
    // Aggregated state
    isLoading,
    hasLoadedCriticalData,
    retryAll,

    // Departments
    departments: {
      data: departments,
      isLoading: departmentsLoading,
      error: departmentsError,
      retry: revalidateDepartments,
    } as DatasetState<Department[]>,

    // Job Roles
    jobRoles: {
      data: jobRoles,
      isLoading: jobRolesLoading,
      error: jobRolesError,
      retry: revalidateJobRoles,
    } as DatasetState<JobRole[]>,

    // Employees
    employees: {
      data: employees,
      isLoading: employeesLoading,
      error: employeesError,
      retry: revalidateEmployees,
    } as DatasetState<EmployeeSummary[]>,

    // Locations
    locations: {
      data: locations,
      isLoading: locationsLoading,
      error: locationsError,
      retry: revalidateLocations,
    } as DatasetState<Location[]>,

    // Contract Types
    contractTypes: {
      data: contractTypes,
      isLoading: contractTypesLoading,
      error: contractTypesError,
      retry: revalidateContractTypes,
    } as DatasetState<ContractType[]>,

    // Templates
    templates: {
      data: normalizedTemplates,
      isLoading: templatesLoading,
      error: templatesError,
      retry: revalidateTemplates,
    } as DatasetState<OnboardingTemplate[]>,

    // Working Patterns
    workingPatterns: {
      data: workingPatterns,
      isLoading: workingPatternsLoading,
      error: workingPatternsError,
      retry: revalidateWorkingPatterns,
    } as DatasetState<WorkingPattern[]>,

    // Permission Profiles
    permissionProfiles: {
      data: permissionProfiles,
      isLoading: permissionProfilesLoading,
      error: permissionProfilesError,
      retry: revalidatePermissionProfiles,
    } as DatasetState<PermissionProfile[]>,

    // Rota Groups
    rotaGroups: {
      data: rotaGroups,
      isLoading: rotaGroupsLoading,
      error: rotaGroupsError,
      retry: revalidateRotaGroups,
    } as DatasetState<RotaGroup[]>,
  };
}
