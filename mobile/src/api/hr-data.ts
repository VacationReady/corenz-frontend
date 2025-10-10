const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

/**
 * Fetch employee profile for the signed-in user
 */
export async function getEmployeeProfile(userId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/employees?status=active&userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
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
  const response = await fetch(
    `${API_BASE_URL}/api/onboarding/instances/employee/${employeeId}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
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
  const response = await fetch(
    `${API_BASE_URL}/api/leave-request?scope=my`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
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
  const url = `${API_BASE_URL}/api/employees${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch employees");
  }

  return response.json();
}
