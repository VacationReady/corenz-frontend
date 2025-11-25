import { apiFetch } from './client';

export interface LeaveBalance {
  id: string;
  policyId: string;
  policyName: string;
  totalAllowance: number;
  used: number;
  remaining: number;
  pending: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  policyId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
  };
  policy?: {
    name: string;
  };
}

/**
 * Get leave balances for the current user
 */
export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  const response = await apiFetch('/api/leave-request?scope=balances', {        
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch leave balances');
  }

  const data = await response.json();
  // Server may return array directly or wrapped in { success, data }
  return Array.isArray(data) ? data : (data.data || []);
}

/**
 * Get leave requests for the current user
 */
export async function getMyLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await apiFetch('/api/leave-request?scope=my', {
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch leave requests');
  }

  const data = await response.json();
  // Server returns { success, data } format
  return Array.isArray(data) ? data : (data.data || []);
}

/**
 * Submit a new leave request
 */
export async function submitLeaveRequest(data: {
  policyId: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<LeaveRequest> {
  const response = await apiFetch('/api/leave-request', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit leave request');
  }

  return response.json();
}

/**
 * Get leave policies
 */
export async function getLeavePolicies() {
  const response = await apiFetch('/api/leave-policies', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch leave policies');
  }

  return response.json();
}
