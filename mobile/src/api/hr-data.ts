import { apiFetch } from './client';

/**
 * Fetch employee profile for the signed-in user
 */
export async function getEmployeeProfile(userId: string) {
  const response = await apiFetch(
    `/api/employees?status=active&userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch employee profile");
  }

  const employees = await response.json();
  return Array.isArray(employees) ? employees[0] : null;
}

/**
 * Fetch onboarding progress for an employee
 */
export async function getOnboardingProgress(employeeId: string) {
  const response = await apiFetch(
    `/api/onboarding/instances/employee/${employeeId}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch onboarding progress");
  }

  return response.json();
}

/**
 * Fetch pending leave requests
 */
export async function getPendingLeaveRequests() {
  const response = await apiFetch(
    `/api/leave-request?scope=my`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch leave requests");
  }

  return response.json();
}

/**
 * Fetch all employees (for admins/managers)
 */
export async function getAllEmployees(params?: { status?: string; department?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.department) queryParams.append("department", params.department);

  const queryString = queryParams.toString();
  const url = `/api/employees${queryString ? `?${queryString}` : ""}`;

  const response = await apiFetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch employees");
  }

  return response.json();
}
