/**
 * Custom hooks for workflow reference data with proper error handling and loading states
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface UseReferenceDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch departments
 */
export function useDepartments(): UseReferenceDataResult<{ id: string; name: string }> {
  const [data, setData] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/departments');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch departments' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const departments = Array.isArray(result) ? result : [];
      setData(departments.map(d => ({ id: d.id, name: d.name })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load departments';
      setError(message);
      console.error('[useDepartments]', err);
      toast.error(`Departments: ${message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch job roles
 */
export function useJobRoles(): UseReferenceDataResult<{ id: string; name: string }> {
  const [data, setData] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/job-roles');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch job roles' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const jobRoles = Array.isArray(result) ? result : [];
      setData(jobRoles.map(r => ({ id: r.id, name: r.name })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job roles';
      setError(message);
      console.error('[useJobRoles]', err);
      toast.error(`Job Roles: ${message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch forms
 */
export function useForms(): UseReferenceDataResult<{ id: string; name: string }> {
  const [data, setData] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/forms');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch forms' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const forms = Array.isArray(result) ? result : [];
      setData(forms.map(f => ({ id: f.id, name: f.name })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load forms';
      setError(message);
      console.error('[useForms]', err);
      toast.error(`Forms: ${message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch active employees
 */
export function useActiveEmployees(): UseReferenceDataResult<{
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
}> {
  const [data, setData] = useState<{
    id: string;
    name: string;
    email: string;
    firstName: string;
    lastName: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/employees?status=active');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch employees' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const employees = Array.isArray(result)
        ? result
        : (Array.isArray(result?.data) ? result.data : []);
      setData(
        employees.map(e => ({
          id: e.id,
          name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email,
          email: e.email,
          firstName: e.firstName ?? "",
          lastName: e.lastName ?? "",
        })),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employees';
      setError(message);
      console.error('[useActiveEmployees]', err);
      toast.error(`Employees: ${message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch employment check types
 */
export function useEmploymentCheckTypes(): UseReferenceDataResult<string> {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/employment-checks/types');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch check types' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const types = Array.isArray(result) ? result : [];
      setData(types);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employment check types';
      setError(message);
      console.error('[useEmploymentCheckTypes]', err);
      toast.error(`Check Types: ${message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch onboarding templates
 */
export function useOnboardingTemplates(): UseReferenceDataResult<{ id: string; name: string }> {
  const [data, setData] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/onboarding/templates');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch templates' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const templates = Array.isArray(result) ? result : [];
      setData(templates.map(t => ({ id: t.id, name: t.name })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load onboarding templates';
      setError(message);
      console.error('[useOnboardingTemplates]', err);
      toast.error(`Templates: ${message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch users (with limit)
 */
export function useUsers(limit: number = 100): UseReferenceDataResult<{ id: string; name: string; email: string }> {
  const [data, setData] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/users?limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const users = Array.isArray(result) ? result : [];
      setData(users.map(u => ({ 
        id: u.id, 
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email 
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setError(message);
      console.error('[useUsers]', err);
      toast.error(`Users: ${message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [limit]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Combined hook to fetch all workflow reference data at once
 */
export function useWorkflowReferenceData() {
  const departments = useDepartments();
  const jobRoles = useJobRoles();
  const forms = useForms();
  const employees = useActiveEmployees();
  const documentTypes = useEmploymentCheckTypes();
  const templates = useOnboardingTemplates();
  const users = useUsers();

  const loading = 
    departments.loading || 
    jobRoles.loading || 
    forms.loading || 
    employees.loading || 
    documentTypes.loading || 
    templates.loading ||
    users.loading;

  const hasError = 
    departments.error || 
    jobRoles.error || 
    forms.error || 
    employees.error || 
    documentTypes.error || 
    templates.error ||
    users.error;

  const refetchAll = async () => {
    await Promise.all([
      departments.refetch(),
      jobRoles.refetch(),
      forms.refetch(),
      employees.refetch(),
      documentTypes.refetch(),
      templates.refetch(),
      users.refetch(),
    ]);
  };

  return {
    departments: departments.data,
    jobRoles: jobRoles.data,
    forms: forms.data,
    employees: employees.data,
    documentTypes: documentTypes.data,
    templates: templates.data,
    users: users.data,
    loading,
    hasError,
    refetchAll,
    individualLoading: {
      departments: departments.loading,
      jobRoles: jobRoles.loading,
      forms: forms.loading,
      employees: employees.loading,
      documentTypes: documentTypes.loading,
      templates: templates.loading,
      users: users.loading,
    },
    errors: {
      departments: departments.error,
      jobRoles: jobRoles.error,
      forms: forms.error,
      employees: employees.error,
      documentTypes: documentTypes.error,
      templates: templates.error,
      users: users.error,
    },
  };
}
