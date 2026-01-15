import { apiFetch, apiClient } from './client';

export interface EmployeeProfile {
  id: string;
  userId: string;
  companyId: string;
  isActive: boolean;
  startDate: string | null;
  employmentType: string | null;
  jobTitle: string | null;
  siteLocation: string | null;
  salaryAmount: number | null;
  hourlyRate: number | null;
  bankAccountNumber: string | null;
  irdNumber: string | null;
  kiwiSaverEnrolled: boolean | null;
  kiwiSaverContribution: number | null;
  taxCode: string | null;
  profileImage: string | null;
  User: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    profileImageUrl: string | null;
    role: string;
    pronouns: string | null;
    addressStreet: string | null;
    addressCity: string | null;
    addressPostcode: string | null;
    addressCountry: string | null;
    genderOptionId: string | null;
    nationalId: string | null;
  };
  Department: {
    id: string;
    name: string;
  } | null;
  JobRole: {
    id: string;
    name: string;
  } | null;
  Manager?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
}

export interface LeaveBalance {
  id: string;
  totalDays: number;
  usedDays: number;
  EventCategory: {
    id: string;
    name: string;
    color: string | null;
  };
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  fileUrl: string | null;
  category: string | null;
}

/**
 * Get the current user's employee profile with full details
 */
export async function getMyFullProfile(): Promise<EmployeeProfile | null> {
  const response = await apiFetch('/api/employees/me', { method: 'GET' });
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch profile');
  }
  
  return response.json();
}

/**
 * Get an employee's profile by ID (for admins viewing team members)
 */
export async function getEmployeeById(employeeId: string): Promise<EmployeeProfile | null> {
  const response = await apiFetch(`/api/employees/${employeeId}`, { method: 'GET' });
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch employee');
  }
  
  return response.json();
}

/**
 * Get emergency contacts for an employee
 */
export async function getEmergencyContacts(employeeId: string): Promise<EmergencyContact[]> {
  const response = await apiFetch(`/api/employees/${employeeId}/emergency-contacts`, { method: 'GET' });
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    return [];
  }
  
  return response.json();
}

/**
 * Create an emergency contact
 */
export async function createEmergencyContact(
  employeeId: string,
  contact: Omit<EmergencyContact, 'id'>,
  reason?: string
): Promise<EmergencyContact> {
  const response = await apiFetch(`/api/employees/${employeeId}/emergency-contacts`, {
    method: 'POST',
    body: JSON.stringify({ ...contact, reason }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create contact' }));
    throw new Error(error.error || 'Failed to create contact');
  }
  
  return response.json();
}

/**
 * Update an emergency contact
 */
export async function updateEmergencyContact(
  employeeId: string,
  contact: EmergencyContact,
  reasons?: Record<string, string>
): Promise<EmergencyContact> {
  const response = await apiFetch(`/api/employees/${employeeId}/emergency-contacts`, {
    method: 'PATCH',
    body: JSON.stringify({ ...contact, reasons }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update contact' }));
    throw new Error(error.error || 'Failed to update contact');
  }
  
  return response.json();
}

/**
 * Delete an emergency contact
 */
export async function deleteEmergencyContact(
  employeeId: string,
  contactId: string,
  reason?: string
): Promise<void> {
  const response = await apiFetch(`/api/employees/${employeeId}/emergency-contacts`, {
    method: 'DELETE',
    body: JSON.stringify({ id: contactId, reason }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete contact' }));
    throw new Error(error.error || 'Failed to delete contact');
  }
}

/**
 * Update personal information
 */
export async function updatePersonalInfo(
  employeeId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    pronouns?: string;
    addressStreet?: string;
    addressCity?: string;
    addressPostcode?: string;
    addressCountry?: string;
  },
  reasons?: Record<string, string>
): Promise<{ ok: boolean; pendingApproval?: boolean }> {
  const response = await apiFetch(`/api/employees/${employeeId}/personal-info`, {
    method: 'PATCH',
    body: JSON.stringify({ ...data, reasons, section: 'personal-info' }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update' }));
    throw new Error(error.error || 'Failed to update personal info');
  }
  
  return response.json();
}

/**
 * Update employment details
 */
export async function updateEmploymentDetails(
  employeeId: string,
  data: {
    jobTitle?: string;
    departmentId?: string;
    managerId?: string;
    employmentType?: string;
    startDate?: string;
    siteLocation?: string;
  },
  reasons?: Record<string, string>
): Promise<{ ok: boolean; pendingApproval?: boolean }> {
  const response = await apiFetch(`/api/employees/${employeeId}/employment-details`, {
    method: 'PATCH',
    body: JSON.stringify({ ...data, reasons }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update' }));
    throw new Error(error.error || 'Failed to update employment details');
  }
  
  return response.json();
}

/**
 * Update bank & payroll details
 */
export async function updateBankPayroll(
  employeeId: string,
  data: {
    bankAccountNumber?: string;
    irdNumber?: string;
    taxCode?: string;
    kiwiSaverEnrolled?: boolean;
    kiwiSaverContribution?: number;
    salaryAmount?: number;
    hourlyRate?: number;
  },
  reasons?: Record<string, string>
): Promise<{ ok: boolean; pendingApproval?: boolean }> {
  const response = await apiFetch(`/api/employees/${employeeId}/bank-payroll`, {
    method: 'PATCH',
    body: JSON.stringify({ ...data, reasons }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update' }));
    throw new Error(error.error || 'Failed to update bank & payroll');
  }
  
  return response.json();
}

/**
 * Get leave balances for an employee
 */
export async function getLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  const response = await apiFetch(`/api/employees/${employeeId}/leave-balances`, { method: 'GET' });
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    return [];
  }
  
  const data = await response.json();
  return data.entitlements || [];
}

/**
 * Get documents for an employee
 */
export async function getEmployeeDocuments(employeeId: string): Promise<Document[]> {
  const response = await apiFetch(`/api/documents/list-employee?employeeId=${employeeId}`, { method: 'GET' });
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Unauthorized');
    }
    return [];
  }
  
  return response.json();
}

/**
 * Get audit history for an employee section
 */
export async function getAuditHistory(
  employeeId: string,
  section?: string
): Promise<any[]> {
  const url = section 
    ? `/api/employees/${employeeId}/audit?section=${section}`
    : `/api/employees/${employeeId}/audit`;
    
  const response = await apiFetch(url, { method: 'GET' });
  
  if (!response.ok) {
    return [];
  }
  
  return response.json();
}

/**
 * Check if user has admin/manager role
 */
export async function getUserRole(): Promise<{ role: string; isAdmin: boolean; isManager: boolean }> {
  const response = await apiFetch('/api/auth/session', { method: 'GET' });
  
  if (!response.ok) {
    return { role: 'EMPLOYEE', isAdmin: false, isManager: false };
  }
  
  const session = await response.json();
  const role = session?.user?.role || 'EMPLOYEE';
  
  return {
    role,
    isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN',
    isManager: role === 'MANAGER' || role === 'ADMIN' || role === 'SUPER_ADMIN',
  };
}
