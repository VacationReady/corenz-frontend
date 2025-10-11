const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

export interface Employee {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  managerId?: string;
  status: 'active' | 'inactive' | 'onLeave';
  profileImage?: string;
  phone?: string;
  startDate?: string;
  manager?: {
    firstName: string;
    lastName: string;
  };
}

/**
 * Get team members (direct reports if manager, or department colleagues)
 */
export async function getMyTeam(): Promise<Employee[]> {
  const response = await fetch(`${API_BASE_URL}/api/employees?scope=team`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch team');
  }

  return response.json();
}

/**
 * Get all employees (directory)
 */
export async function getAllEmployees(params?: { 
  status?: string; 
  department?: string;
  search?: string;
}): Promise<Employee[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.department) queryParams.append('department', params.department);
  if (params?.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/api/employees${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch employees');
  }

  return response.json();
}

/**
 * Get employee details
 */
export async function getEmployeeDetails(employeeId: string): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/api/employees/${employeeId}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch employee details');
  }

  return response.json();
}
