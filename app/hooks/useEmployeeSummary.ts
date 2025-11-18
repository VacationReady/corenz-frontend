import useSWR from "swr";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = (errorPayload && (errorPayload.error || errorPayload.message)) || "Request failed";
    throw new Error(message);
  }
  return response.json();
};

export interface EmployeeHeaderSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string | null;
  department: string | null;
  photoUrl: string | null;
}

interface Options {
  enabled?: boolean;
}

export function useEmployeeSummary(employeeId: string | undefined, options: Options = {}) {
  const { enabled = true } = options;
  
  const { data, error, isLoading } = useSWR<EmployeeHeaderSummary>(
    enabled && employeeId ? `/api/employees/${employeeId}/summary` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    employee: data,
    isLoading,
    error,
  };
}
