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

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: "include",
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
 * Fetches all employees using cursor-based pagination.
 * The employees API no longer supports limit=all, so we paginate through all results.
 */
const paginatedEmployeeFetcher = async (baseUrl: string): Promise<EmployeeSummary[]> => {
  const allEmployees: EmployeeSummary[] = [];
  let cursor: string | null = null;
  const limit = 100;
  
  // Extract base params from URL (e.g., select=id,firstName,lastName,email)
  const url = new URL(baseUrl, window.location.origin);
  const baseParams = new URLSearchParams(url.search);
  // Remove any _v cache-busting param for the actual requests
  baseParams.delete('_v');
  
  do {
    const params = new URLSearchParams(baseParams);
    params.set('limit', limit.toString());
    if (cursor) {
      params.set('cursor', cursor);
    }
    
    const response = await fetch(`${url.pathname}?${params.toString()}`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const message =
        errorPayload?.error ||
        errorPayload?.message ||
        `Failed to load employees (${response.status})`;
      throw new Error(message);
    }
    
    const result = await response.json();
    const employees = result.data || result || [];
    
    if (Array.isArray(employees)) {
      allEmployees.push(...employees);
    }
    
    cursor = result.pagination?.cursor || null;
  } while (cursor);
  
  return allEmployees;
};

/**
 * Shared hook for employee modal reference data with SWR caching.
 * Provides stale-while-revalidate semantics with granular error handling per dataset.
 * @param enabled - Whether to fetch data (default: true)
 */
export function useEmployeeModalData(enabled: boolean = true) {
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
      dedupingInterval: 60000,
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

  // Employees - use paginated fetcher since limit=all is not supported
  // NZ HRIS: Only fetch active employees for manager/reference dropdowns
  // This prevents inactive/terminated employees from being assigned as managers
  const {
    data: employeesResponse,
    error: employeesError,
    isLoading: employeesLoading,
    mutate: revalidateEmployees,
  } = useSWRImmutable<EmployeeSummary[]>(
    enabled
      ? `/api/employees?select=id,firstName,lastName,email&status=active&_v=${manualRevalidate}`
      : null,
    paginatedEmployeeFetcher,
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

  // Permission Profiles
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

  // Rota Groups
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

  // Normalize data - handle both array and object responses
  const departments: Department[] = Array.isArray(departmentsData) 
    ? departmentsData 
    : (departmentsData as any)?.departments || [];
    
  const jobRoles: JobRole[] = Array.isArray(jobRolesData) 
    ? jobRolesData 
    : (jobRolesData as any)?.jobRoles || [];
    
  const employees: EmployeeSummary[] = Array.isArray(employeesResponse) 
    ? employeesResponse 
    : [];
    
  const locations: Location[] = Array.isArray(locationsData) ? locationsData : [];
  
  const contractTypes: ContractType[] = Array.isArray(contractTypesData) ? contractTypesData : [];
  
  const templates: OnboardingTemplate[] = Array.isArray(templatesData) 
    ? templatesData 
    : (templatesData as any)?.templates || [];
    
  const workingPatterns: WorkingPattern[] = Array.isArray(workingPatternsData) ? workingPatternsData : [];
  
  const permissionProfiles: PermissionProfile[] = Array.isArray(permissionProfilesData) ? permissionProfilesData : [];
  
  const rotaGroups: RotaGroup[] = (rotaGroupsData as any)?.rotaGroups || [];

  // Normalize templates
  const normalizedTemplates: OnboardingTemplate[] = templates.map((t: any) => ({
    id: t?.id ?? '',
    name: t?.name ?? '',
    departments: Array.isArray(t?.departments || t?.Department) 
      ? (t.departments || t.Department).map((d: any) => ({ id: d?.id ?? '' }))
      : [],
    jobRoles: Array.isArray(t?.jobRoles || t?.JobRole)
      ? (t.jobRoles || t.JobRole).map((j: any) => ({ id: j?.id ?? '' }))
      : [],
  }));

  // Retry all datasets
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

  // Check if all critical data has loaded
  const hasLoadedCriticalData = !templatesLoading && templates.length >= 0;

  return {
    isLoading,
    hasLoadedCriticalData,
    retryAll,

    departments: {
      data: departments,
      isLoading: departmentsLoading,
      error: departmentsError || null,
      retry: revalidateDepartments,
    } as DatasetState<Department[]>,

    jobRoles: {
      data: jobRoles,
      isLoading: jobRolesLoading,
      error: jobRolesError || null,
      retry: revalidateJobRoles,
    } as DatasetState<JobRole[]>,

    employees: {
      data: employees,
      isLoading: employeesLoading,
      error: employeesError || null,
      retry: revalidateEmployees,
    } as DatasetState<EmployeeSummary[]>,

    locations: {
      data: locations,
      isLoading: locationsLoading,
      error: locationsError || null,
      retry: revalidateLocations,
    } as DatasetState<Location[]>,

    contractTypes: {
      data: contractTypes,
      isLoading: contractTypesLoading,
      error: contractTypesError || null,
      retry: revalidateContractTypes,
    } as DatasetState<ContractType[]>,

    templates: {
      data: normalizedTemplates,
      isLoading: templatesLoading,
      error: templatesError || null,
      retry: revalidateTemplates,
    } as DatasetState<OnboardingTemplate[]>,

    workingPatterns: {
      data: workingPatterns,
      isLoading: workingPatternsLoading,
      error: workingPatternsError || null,
      retry: revalidateWorkingPatterns,
    } as DatasetState<WorkingPattern[]>,

    permissionProfiles: {
      data: permissionProfiles,
      isLoading: permissionProfilesLoading,
      error: permissionProfilesError || null,
      retry: revalidatePermissionProfiles,
    } as DatasetState<PermissionProfile[]>,

    rotaGroups: {
      data: rotaGroups,
      isLoading: rotaGroupsLoading,
      error: rotaGroupsError || null,
      retry: revalidateRotaGroups,
    } as DatasetState<RotaGroup[]>,
  };
}
