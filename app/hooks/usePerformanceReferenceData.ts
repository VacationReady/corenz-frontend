import useSWRImmutable from "swr/immutable";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = (errorPayload && (errorPayload.error || errorPayload.message)) || "Request failed";
    throw new Error(message);
  }
  return response.json();
};

interface Options {
  enabled?: boolean;
  templateType?: "ONE_TO_ONE" | "REVIEW" | "360";
  includeEmployees?: boolean;
}

export function usePerformanceReferenceData({ enabled = true, templateType, includeEmployees = false }: Options = {}) {
  const { data: departmentsData } = useSWRImmutable<{ departments: { id: string; name: string }[] }>(
    enabled ? "/api/departments" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: jobRolesData } = useSWRImmutable<{ jobRoles: { id: string; name: string }[] }>(
    enabled ? "/api/job-roles" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: employeesData, isLoading: employeesLoading } = useSWRImmutable<{ employees: any[] }>(
    enabled && includeEmployees ? "/api/employees" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const templateQuery = templateType ? `/api/performance/templates?type=${templateType}` : null;
  const { data: templatesData, isLoading: templatesLoading } = useSWRImmutable<{ templates: any[] }>(
    enabled && templateQuery ? templateQuery : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    departments: departmentsData?.departments ?? [],
    jobRoles: jobRolesData?.jobRoles ?? [],
    employees: employeesData?.employees ?? [],
    employeesLoading,
    templates: templatesData?.templates ?? [],
    templatesLoading,
  };
}
