import { apiFetch } from './client';

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
export async function getMyTeam(params?: {
  departmentId?: string;
  includeInactive?: boolean;
}): Promise<Employee[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('scope', 'team');
  searchParams.set('status', params?.includeInactive ? 'all' : 'active');
  if (params?.departmentId) {
    searchParams.set('departmentId', params.departmentId);
  }

  const response = await apiFetch(`/api/employees?${searchParams.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch team');
  }

  const result = await response.json();
  // API returns { data, pagination } format
  return Array.isArray(result) ? result : (result.data || []);
}

/**
 * Get all employees (directory)
 */
export async function getAllEmployees(params?: {
  status?: string;
  departmentId?: string;
  search?: string;
  includeInactive?: boolean;
}): Promise<Employee[]> {
  const queryParams = new URLSearchParams();
  const status = params?.status ?? (params?.includeInactive ? 'all' : 'active');
  queryParams.append('status', status);
  if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
  if (params?.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = `/api/employees${queryString ? `?${queryString}` : ''}`;

  const response = await apiFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch employees');
  }

  const result = await response.json();
  // API returns { data, pagination } format
  return Array.isArray(result) ? result : (result.data || []);
}

/**
 * Get employee details
 */
export async function getEmployeeDetails(employeeId: string): Promise<Employee> {
  const response = await apiFetch(`/api/employees/${employeeId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch employee details');
  }

  return response.json();
}
