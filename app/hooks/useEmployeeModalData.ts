import useSWRImmutable from "swr/immutable";
import { useEffect, useMemo, useState, useCallback } from "react";

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
  const fetcher = useMemo(() => createFetcher(companyId), [companyId]);
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

  // Employees - fetch for line manager dropdown
  // Use status=all to include all employees regardless of isActive status
  // This ensures system admins and other users appear in the manager dropdown
  // Note: Using limit=100 (max allowed) instead of limit=all which is rejected by the API
  const {
    data: employeesResponse,
    error: employeesError,
    isLoading: employeesLoading,
    mutate: revalidateEmployees,
  } = useSWRImmutable<EmployeeSummary[] | { data: EmployeeSummary[] }>(
    enabled ? `/api/employees?select=id,firstName,lastName,email&_v=${manualRevalidate}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  // Normalize employees data - ensure we always return an array
  const employees = useMemo(() => {
    if (!employeesResponse) return [];
    if (Array.isArray(employeesResponse)) return employeesResponse;
    if (Array.isArray(employeesResponse.data)) return employeesResponse.data;
    return [];
  }, [employeesResponse]);

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
  // Add defensive checks to ensure we always return arrays
  // Memoize to prevent creating new array references on every render
  const departments = useMemo(() => {
    if (Array.isArray(departmentsData)) return departmentsData;
    if (Array.isArray((departmentsData as any)?.departments)) return (departmentsData as any).departments;
    return [];
  }, [departmentsData]);

  const jobRoles = useMemo(() => {
    if (Array.isArray(jobRolesData)) return jobRolesData;
    if (Array.isArray((jobRolesData as any)?.jobRoles)) return (jobRolesData as any).jobRoles;
    return [];
  }, [jobRolesData]);

  const locations = useMemo(() => {
    return Array.isArray(locationsData) ? locationsData : [];
  }, [locationsData]);

  const contractTypes = useMemo(() => {
    return Array.isArray(contractTypesData) ? contractTypesData : [];
  }, [contractTypesData]);

  const templates = useMemo(() => {
    if (Array.isArray(templatesData)) return templatesData;
    if (Array.isArray((templatesData as any)?.templates)) return (templatesData as any).templates;
    return [];
  }, [templatesData]);

  const workingPatterns = useMemo(() => {
    return Array.isArray(workingPatternsData) ? workingPatternsData : [];
  }, [workingPatternsData]);

  const permissionProfiles = useMemo(() => {
    return Array.isArray(permissionProfilesData) ? permissionProfilesData : [];
  }, [permissionProfilesData]);

  const rotaGroups = useMemo(() => {
    return Array.isArray((rotaGroupsData as any)?.rotaGroups) ? (rotaGroupsData as any).rotaGroups : [];
  }, [rotaGroupsData]);

  useEffect(() => {
    if (!enabled) return;
    if (employeesLoading) return;
    if (employeesError) return;

    // Keep this log in an effect so it doesn't spam on every render.
    console.log("[useEmployeeModalData] Employees loaded:", {
      rawDataType: typeof employeesResponse,
      isArray: Array.isArray(employeesResponse),
      hasDataProp: !!(employeesResponse as any)?.data,
      normalizedCount: employees.length,
      companyId,
    });
  }, [enabled, employeesLoading, employeesError, employeesResponse, employees.length, companyId]);

  // Normalize templates - ensure we handle any edge cases
  // Memoize to prevent creating new array references on every render
  const normalizedTemplates = useMemo<OnboardingTemplate[]>(() => {
    const templateArray = Array.isArray(templates) ? templates : [];
    return templateArray.map((t: any) => ({
      id: t?.id ?? '',
      name: t?.name ?? '',
      departments: Array.isArray(t?.departments || t?.Department) 
        ? (t.departments || t.Department).map((d: any) => ({ id: d?.id ?? '' }))
        : [],
      jobRoles: Array.isArray(t?.jobRoles || t?.JobRole)
        ? (t.jobRoles || t.JobRole).map((j: any) => ({ id: j?.id ?? '' }))
        : [],
    }));
  }, [templates]);

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

  // Wrap retry functions in useCallback to prevent new references on every render
  // SWR's mutate function changes reference on every render, causing infinite loops
  const retryDepartments = useCallback(() => revalidateDepartments(), [revalidateDepartments]);
  const retryJobRoles = useCallback(() => revalidateJobRoles(), [revalidateJobRoles]);
  const retryEmployees = useCallback(() => revalidateEmployees(), [revalidateEmployees]);
  const retryLocations = useCallback(() => revalidateLocations(), [revalidateLocations]);
  const retryContractTypes = useCallback(() => revalidateContractTypes(), [revalidateContractTypes]);
  const retryTemplates = useCallback(() => revalidateTemplates(), [revalidateTemplates]);
  const retryWorkingPatterns = useCallback(() => revalidateWorkingPatterns(), [revalidateWorkingPatterns]);
  const retryPermissionProfiles = useCallback(() => revalidatePermissionProfiles(), [revalidatePermissionProfiles]);
  const retryRotaGroups = useCallback(() => revalidateRotaGroups(), [revalidateRotaGroups]);

  // Memoize each dataset state object to prevent new references on every render
  // This prevents React error #185 (Maximum update depth exceeded) in consuming components
  const departmentsState = useMemo<DatasetState<Department[]>>(() => ({
    data: departments,
    isLoading: departmentsLoading,
    error: departmentsError || null,
    retry: retryDepartments,
  }), [departments, departmentsLoading, departmentsError, retryDepartments]);

  const jobRolesState = useMemo<DatasetState<JobRole[]>>(() => ({
    data: jobRoles,
    isLoading: jobRolesLoading,
    error: jobRolesError || null,
    retry: retryJobRoles,
  }), [jobRoles, jobRolesLoading, jobRolesError, retryJobRoles]);

  const employeesState = useMemo<DatasetState<EmployeeSummary[]>>(() => ({
    data: employees,
    isLoading: employeesLoading,
    error: employeesError || null,
    retry: retryEmployees,
  }), [employees, employeesLoading, employeesError, retryEmployees]);

  const locationsState = useMemo<DatasetState<Location[]>>(() => ({
    data: locations,
    isLoading: locationsLoading,
    error: locationsError || null,
    retry: retryLocations,
  }), [locations, locationsLoading, locationsError, retryLocations]);

  const contractTypesState = useMemo<DatasetState<ContractType[]>>(() => ({
    data: contractTypes,
    isLoading: contractTypesLoading,
    error: contractTypesError || null,
    retry: retryContractTypes,
  }), [contractTypes, contractTypesLoading, contractTypesError, retryContractTypes]);

  const templatesState = useMemo<DatasetState<OnboardingTemplate[]>>(() => ({
    data: normalizedTemplates,
    isLoading: templatesLoading,
    error: templatesError || null,
    retry: retryTemplates,
  }), [normalizedTemplates, templatesLoading, templatesError, retryTemplates]);

  const workingPatternsState = useMemo<DatasetState<WorkingPattern[]>>(() => ({
    data: workingPatterns,
    isLoading: workingPatternsLoading,
    error: workingPatternsError || null,
    retry: retryWorkingPatterns,
  }), [workingPatterns, workingPatternsLoading, workingPatternsError, retryWorkingPatterns]);

  const permissionProfilesState = useMemo<DatasetState<PermissionProfile[]>>(() => ({
    data: permissionProfiles,
    isLoading: permissionProfilesLoading,
    error: permissionProfilesError || null,
    retry: retryPermissionProfiles,
  }), [permissionProfiles, permissionProfilesLoading, permissionProfilesError, retryPermissionProfiles]);

  const rotaGroupsState = useMemo<DatasetState<RotaGroup[]>>(() => ({
    data: rotaGroups,
    isLoading: rotaGroupsLoading,
    error: rotaGroupsError || null,
    retry: retryRotaGroups,
  }), [rotaGroups, rotaGroupsLoading, rotaGroupsError, retryRotaGroups]);

  // Memoize the entire return object to prevent new references on every render
  return useMemo(() => ({
    // Aggregated state
    isLoading,
    hasLoadedCriticalData,
    retryAll,

    // Dataset states (memoized)
    departments: departmentsState,
    jobRoles: jobRolesState,
    employees: employeesState,
    locations: locationsState,
    contractTypes: contractTypesState,
    templates: templatesState,
    workingPatterns: workingPatternsState,
    permissionProfiles: permissionProfilesState,
    rotaGroups: rotaGroupsState,
  }), [
    isLoading,
    hasLoadedCriticalData,
    retryAll,
    departmentsState,
    jobRolesState,
    employeesState,
    locationsState,
    contractTypesState,
    templatesState,
    workingPatternsState,
    permissionProfilesState,
    rotaGroupsState,
  ]);
}
