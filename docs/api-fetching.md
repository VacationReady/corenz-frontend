# API Fetching Guide

This document describes the centralized API fetching infrastructure and how to use it throughout the application.

## Overview

The application uses a unified API client system that provides:

- **Type-safe requests and responses**
- **Automatic error handling and normalization**
- **AbortSignal support for request cancellation**
- **SWR integration for automatic caching and revalidation**
- **Consistent error structure across the application**

## Architecture

### Core Files

1. **`lib/apiClient.ts`** - Low-level fetch wrapper with typed methods
2. **`app/hooks/useApi.ts`** - React hooks for SWR integration
3. **`lib/mutations.ts`** - Mutation helpers for POST/PUT/PATCH/DELETE operations
4. **`app/hooks/useMutationWithRefresh.ts`** - React hooks for mutations with router refresh

### Key Features

- **Automatic caching** via SWR (Stale-While-Revalidate)
- **Request deduplication** - Multiple components requesting the same data trigger only one network request
- **Background revalidation** - Data stays fresh without manual refetching
- **Error boundaries** - Consistent error handling across all API calls
- **TypeScript support** - Full type safety for requests and responses

---

## Usage

### Basic GET Request with `useApi`

The `useApi` hook is the primary way to fetch data in React components:

```typescript
import { useApi } from '@/hooks/useApi';

interface Employee {
  id: string;
  name: string;
  email: string;
}

function EmployeeList() {
  const { data, error, isLoading } = useApi<Employee[]>('/api/employees');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map((employee) => (
        <li key={employee.id}>{employee.name}</li>
      ))}
    </ul>
  );
}
```

### GET Request with Query Parameters

```typescript
const { data, error, isLoading } = useApi<Employee[]>('/api/employees', {
  params: {
    status: 'active',
    department: 'engineering',
    limit: 50,
  },
});
```

### Conditional Fetching

Disable fetching until certain conditions are met:

```typescript
const { data } = useApi<Employee>(
  employeeId ? `/api/employees/${employeeId}` : null,
  { enabled: !!employeeId }
);
```

### Manual Revalidation

Trigger a refetch manually:

```typescript
const { data, mutate } = useApi<Employee[]>('/api/employees');

const handleRefresh = () => {
  mutate(); // Refetch the data
};
```

---

## Mutations (POST, PUT, PATCH, DELETE)

### Using `useApiMutation`

For creating, updating, or deleting resources:

```typescript
import { useApiMutation } from '@/hooks/useApi';

function CreateEmployeeForm() {
  const { trigger, isMutating } = useApiMutation<Employee, CreateEmployeeDto>(
    '/api/employees',
    'POST'
  );

  const handleSubmit = async (formData: CreateEmployeeDto) => {
    try {
      const newEmployee = await trigger(formData);
      toast.success('Employee created!');
    } catch (error) {
      toast.error('Failed to create employee');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isMutating}>
        {isMutating ? 'Creating...' : 'Create Employee'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

Update the UI immediately before the server responds:

```typescript
const { trigger } = useApiMutation<Employee, UpdateEmployeeDto>(
  `/api/employees/${id}`,
  'PUT',
  {
    optimisticData: (currentData) => ({
      ...currentData,
      ...updatedFields,
    }),
    onSuccess: () => {
      mutate('/api/employees'); // Revalidate list
    },
  }
);
```

---

## Paginated Requests

### Using `usePaginatedApi`

For cursor-based pagination with "Load More" pattern:

```typescript
import { usePaginatedApi } from '@/hooks/useApi';

function EmployeeDirectory() {
  const { data, loadMore, hasMore, isLoading } = usePaginatedApi<Employee[]>(
    '/api/employees',
    { params: { limit: 50 } }
  );

  return (
    <div>
      {data?.map((employee) => (
        <EmployeeCard key={employee.id} employee={employee} />
      ))}
      
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

**API Contract:**

The paginated endpoint must return:

```typescript
{
  data: T[],
  pagination: {
    cursor: string | null,
    hasMore: boolean,
    limit: number
  }
}
```

**Example:**

```typescript
// GET /api/employees?limit=50&cursor=abc123
{
  "data": [...],
  "pagination": {
    "cursor": "xyz789",
    "hasMore": true,
    "limit": 50
  }
}
```

---

## Batched Requests

### Using `useBatchedApi`

For fetching multiple resources in a single request:

```typescript
import { useBatchedApi } from '@/hooks/useApi';

function DocumentStatus() {
  const documentIds = ['doc1', 'doc2', 'doc3'];

  const { data, error, isLoading } = useBatchedApi<
    { statuses: Record<string, DocumentStatus> },
    { documentIds: string[] }
  >(
    '/api/documents/status',
    { documentIds }
  );

  if (isLoading) return <div>Loading statuses...</div>;
  if (error) return <div>Error loading statuses</div>;

  return (
    <div>
      {documentIds.map((id) => (
        <div key={id}>
          Document {id}: {data?.statuses[id]?.status}
        </div>
      ))}
    </div>
  );
}
```

**API Contract:**

The batched endpoint receives a POST request with the batch data and returns aggregated results.

---

## Direct API Client Usage

For non-React contexts or when hooks aren't suitable:

```typescript
import { apiClient } from '@/lib/apiClient';

async function fetchEmployeeData(id: string) {
  const { data, error } = await apiClient.get<Employee>(`/api/employees/${id}`);

  if (error) {
    console.error('Failed to fetch employee:', error.message);
    return null;
  }

  return data;
}

async function createEmployee(employeeData: CreateEmployeeDto) {
  const { data, error } = await apiClient.post<Employee, CreateEmployeeDto>(
    '/api/employees',
    employeeData
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

### Available Methods

```typescript
apiClient.get<T>(url, options?)
apiClient.post<T, D>(url, data?, options?)
apiClient.put<T, D>(url, data?, options?)
apiClient.patch<T, D>(url, data?, options?)
apiClient.delete<T>(url, options?)
```

### Request Options

```typescript
interface ApiRequestOptions {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeout?: number; // milliseconds
  signal?: AbortSignal;
  headers?: Record<string, string>;
}
```

---

## Error Handling

### Error Structure

All errors follow a consistent structure:

```typescript
interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}
```

### Handling Errors in Components

```typescript
const { data, error } = useApi<Employee[]>('/api/employees');

useEffect(() => {
  if (error) {
    console.error('Failed to load employees:', error.message);
    toast.error(error.message);
  }
}, [error]);
```

### Global Error Handling

Errors are automatically logged and can be caught by error boundaries:

```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <EmployeeList />
</ErrorBoundary>
```

---

## Caching Strategy

### SWR Configuration

Default SWR options:

```typescript
{
  revalidateOnFocus: false,     // Don't refetch when window regains focus
  revalidateOnReconnect: true,  // Refetch when network reconnects
  dedupingInterval: 2000,       // Dedupe requests within 2 seconds
}
```

### Cache Invalidation

Manually invalidate cache after mutations:

```typescript
import { mutate } from 'swr';

async function deleteEmployee(id: string) {
  await apiClient.delete(`/api/employees/${id}`);
  
  // Invalidate related caches
  mutate('/api/employees');
  mutate(`/api/employees/${id}`);
}
```

### Cache Keys

SWR uses URLs as cache keys. Ensure consistent URL formatting:

```typescript
// ✅ Good - consistent
useApi('/api/employees', { params: { status: 'active' } });

// ❌ Bad - different cache keys
useApi('/api/employees?status=active');
useApi('/api/employees?status=active&');
```

---

## Integration with Existing APIs

### Paginated Employee API

The employee API supports cursor-based pagination:

```typescript
const { data, loadMore, hasMore } = usePaginatedApi<Employee[]>(
  '/api/employees',
  {
    params: {
      limit: 50,
      status: 'active',
      departmentId: selectedDepartment,
    },
  }
);
```

**Endpoint:** `GET /api/employees?limit=50&cursor=abc&status=active`

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "cursor": "next_cursor",
    "hasMore": true,
    "limit": 50
  }
}
```

### Document Batching Endpoint

The document status endpoint supports batching:

```typescript
const { data } = useBatchedApi<
  { statuses: Record<string, DocumentStatus> },
  { documentIds: string[] }
>(
  '/api/documents/status',
  { documentIds: ['doc1', 'doc2', 'doc3'] }
);
```

**Endpoint:** `POST /api/documents/status`

**Request:**
```json
{
  "documentIds": ["doc1", "doc2", "doc3"]
}
```

**Response:**
```json
{
  "statuses": {
    "doc1": { "requiresAck": true, "acknowledged": false, ... },
    "doc2": { "requiresAck": true, "acknowledged": true, ... },
    "doc3": { "requiresSignature": true, "signed": false, ... }
  }
}
```

---

## Migration Guide

### From Manual Fetch

**Before:**
```typescript
const [data, setData] = useState<Employee[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

**After:**
```typescript
const { data, error, isLoading } = useApi<Employee[]>('/api/employees');
```

### From useEffect with Dependencies

**Before:**
```typescript
useEffect(() => {
  if (!departmentId) return;
  
  const fetchData = async () => {
    const res = await fetch(`/api/employees?departmentId=${departmentId}`);
    const json = await res.json();
    setData(json);
  };
  fetchData();
}, [departmentId]);
```

**After:**
```typescript
const { data } = useApi<Employee[]>('/api/employees', {
  params: { departmentId },
  enabled: !!departmentId,
});
```

---

## Best Practices

### 1. Type Safety

Always provide type parameters:

```typescript
// ✅ Good
const { data } = useApi<Employee[]>('/api/employees');

// ❌ Bad
const { data } = useApi('/api/employees');
```

### 2. Error Handling

Handle errors gracefully:

```typescript
const { data, error, isLoading } = useApi<Employee[]>('/api/employees');

if (isLoading) return <Skeleton />;
if (error) return <ErrorState message={error.message} />;
if (!data) return <EmptyState />;

return <EmployeeList employees={data} />;
```

### 3. Loading States

Show loading indicators:

```typescript
<Button disabled={isMutating}>
  {isMutating ? 'Saving...' : 'Save'}
</Button>
```

### 4. Optimistic Updates

Update UI immediately for better UX:

```typescript
const { trigger } = useApiMutation('/api/employees', 'POST', {
  optimisticData: newEmployee,
  onSuccess: () => mutate('/api/employees'),
});
```

### 5. Request Cancellation

Cleanup is automatic, but you can manually cancel:

```typescript
const controller = new AbortController();

apiClient.get('/api/employees', {
  signal: controller.signal,
});

// Later...
controller.abort();
```

---

## Performance Considerations

### Request Deduplication

SWR automatically deduplicates requests:

```typescript
// Only one network request is made
function Component1() {
  const { data } = useApi('/api/employees');
}

function Component2() {
  const { data } = useApi('/api/employees'); // Uses cached data
}
```

### Prefetching

Prefetch data before it's needed:

```typescript
import { mutate } from 'swr';

function prefetchEmployee(id: string) {
  mutate(`/api/employees/${id}`, apiClient.get(`/api/employees/${id}`));
}
```

### Conditional Fetching

Avoid unnecessary requests:

```typescript
const { data } = useApi(
  isAuthenticated ? '/api/employees' : null
);
```

---

## Troubleshooting

### Data Not Updating

**Problem:** Component doesn't reflect server changes

**Solution:** Manually revalidate:
```typescript
const { mutate } = useApi('/api/employees');
mutate(); // Force refetch
```

### Stale Data

**Problem:** Data is outdated

**Solution:** Adjust revalidation settings:
```typescript
const { data } = useApi('/api/employees', {
  revalidateOnFocus: true,
  refreshInterval: 30000, // Refetch every 30 seconds
});
```

### Type Errors

**Problem:** TypeScript errors with response types

**Solution:** Ensure API response matches type definition:
```typescript
interface ApiResponse<T> {
  data: T;
  success: boolean;
}

const { data } = useApi<ApiResponse<Employee[]>>('/api/employees');
const employees = data?.data; // Access nested data
```

---

## Examples

### Dashboard Widgets

See `app/(withSidebar)/dashboard/admin/AdminDashboardClient.tsx`:

```typescript
// Fetch metrics with department filter
const { data: metricsData, isLoading } = useApi<DashboardMetrics>(
  '/api/dashboard/metrics',
  {
    params: selectedDepartment !== 'all' 
      ? { departmentId: selectedDepartment } 
      : undefined,
  }
);

// Batch fetch document statuses
const { data: statusData } = useBatchedApi<
  { statuses: Record<string, DocumentStatus> },
  { documentIds: string[] }
>(
  '/api/documents/status',
  { documentIds },
  { enabled: documentIds.length > 0 }
);
```

### Approval Modal

See `components/approvals/HolidayApprovalModal.tsx`:

```typescript
const { data: response, error, isLoading } = useApi<{
  success: boolean;
  data: ApprovalDetails;
}>(
  decisionId && open ? `/api/approvals/${decisionId}/details` : null
);

const details = response?.success ? response.data : null;
```

### Documents Page

See `app/components/documents/DocumentsPageClient.tsx`:

```typescript
// Fetch documents list
const { data: documentsData, mutate: refetchDocuments } = useApi<Document[]>(
  '/api/documents/list'
);

// Fetch departments and job roles
const { data: departmentsData } = useApi<Department[]>('/api/departments/active');
const { data: jobRolesData } = useApi<JobRole[]>('/api/job-roles/active');
```

---

## Mutation Patterns

### Overview

The mutation system provides a unified approach to POST/PUT/PATCH/DELETE operations with:

- **Automatic toast notifications** - Success and error messages
- **SWR cache invalidation** - Keeps data fresh after mutations
- **Router refresh integration** - Updates server components
- **Loading states** - Built-in mutation tracking
- **Error handling** - Consistent error surfacing

### Core Mutation Utilities

#### Using `lib/mutations.ts` Directly

For non-React contexts or when you need fine-grained control:

```typescript
import { mutatePost, mutatePut, mutateDelete } from '@/lib/mutations';

// POST request with automatic cache invalidation
const result = await mutatePost('/api/employees', employeeData, {
  successMessage: 'Employee created successfully',
  errorMessage: 'Failed to create employee',
  invalidateKeys: ['/api/employees'],
  onSuccess: (data) => {
    console.log('Created:', data);
  },
});

if (result.success) {
  // Handle success
  console.log(result.data);
} else {
  // Handle error
  console.error(result.error);
}
```

#### Mutation Configuration Options

```typescript
interface MutationConfig {
  successMessage?: string | false;        // Toast on success (false = no toast)
  errorMessage?: string | false;          // Toast on error (false = no toast)
  invalidateKeys?: string[];              // SWR keys to invalidate
  invalidatePattern?: RegExp;             // Invalidate keys matching pattern
  onSuccess?: (data: any) => void;        // Success callback
  onError?: (error: Error) => void;       // Error callback
  showLoadingToast?: boolean;             // Show loading toast
  loadingMessage?: string;                // Loading toast message
}
```

### React Hooks for Mutations

#### Basic Mutation Hook

```typescript
import { usePostMutation } from '@/hooks/useMutationWithRefresh';

function CreateEmployeeForm() {
  const { trigger, isMutating, data, error } = usePostMutation<
    Employee,
    CreateEmployeeDto
  >('/api/employees', {
    successMessage: 'Employee created!',
    errorMessage: 'Failed to create employee',
    invalidateKeys: ['/api/employees'],
    refreshRouter: true, // Refresh Next.js server components
  });

  const handleSubmit = async (formData: CreateEmployeeDto) => {
    const result = await trigger(formData);
    if (result.success) {
      // Navigate or update UI
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isMutating}>
        {isMutating ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

#### PUT/PATCH Mutations

```typescript
const { trigger: updateEmployee, isMutating } = usePutMutation<
  Employee,
  UpdateEmployeeDto
>(
  `/api/employees/${employeeId}`,
  {
    successMessage: 'Employee updated',
    invalidateKeys: ['/api/employees', `/api/employees/${employeeId}`],
    refreshRouter: true,
  }
);

// Usage
await updateEmployee(updatedData);
```

#### DELETE Mutations

```typescript
const { trigger: deleteEmployee } = useDeleteMutation(
  `/api/employees/${employeeId}`,
  {
    successMessage: 'Employee deleted',
    invalidateKeys: ['/api/employees'],
    refreshRouter: true,
  }
);

// Usage
const handleDelete = async () => {
  if (confirm('Delete this employee?')) {
    await deleteEmployee();
  }
};
```

#### Dynamic URLs

For mutations where the URL depends on the data:

```typescript
const { trigger: updateLeaveRequest } = usePatchMutation<
  LeaveRequest,
  { requestId: string; action: string }
>(
  (body) => `/api/leave-request/${body?.requestId}`,
  {
    successMessage: 'Request updated',
    invalidateKeys: ['/api/leave-request'],
  }
);

// Usage
await updateLeaveRequest({
  requestId: '123',
  action: 'approve',
});
```

### Optimistic Updates

Update UI immediately before server responds:

```typescript
import { useOptimisticMutation } from '@/hooks/useMutationWithRefresh';

const { trigger } = useOptimisticMutation<Employee, UpdateEmployeeDto>(
  `/api/employees/${id}`,
  '/api/employees', // Cache key
  {
    optimisticData: (current) => ({
      ...current,
      ...updatedFields,
    }),
    successMessage: 'Employee updated',
  }
);
```

### Batch Mutations

Execute multiple mutations sequentially or in parallel:

```typescript
import { batchMutations, parallelMutations } from '@/lib/mutations';

// Sequential (stops on first error)
const { success, results } = await batchMutations(
  [
    () => mutatePost('/api/employees', employee1),
    () => mutatePost('/api/employees', employee2),
    () => mutatePost('/api/employees', employee3),
  ],
  {
    stopOnError: true,
    successMessage: 'All employees created',
    errorMessage: 'Failed to create some employees',
  }
);

// Parallel (all execute simultaneously)
const { success, results } = await parallelMutations(
  [
    () => mutateDelete('/api/documents/1'),
    () => mutateDelete('/api/documents/2'),
    () => mutateDelete('/api/documents/3'),
  ],
  {
    successMessage: 'All documents deleted',
  }
);
```

### Real-World Examples

#### Leave Approvals

See `app/(withSidebar)/dashboard/approvals/page.tsx`:

```typescript
// Fetch leave requests with filters
const { data: requestsData, mutate: refetchRequests } = useApi<{
  success: boolean;
  data: LeaveRequest[];
}>('/api/leave-request', { params: leaveRequestParams });

// Mutation for approving/declining
const { trigger: updateLeaveRequest } = usePatchMutation<
  any,
  { action: 'approve' | 'decline'; decisionId?: string }
>(
  (body) => `/api/leave-request/${body?.requestId}`,
  {
    invalidateKeys: ['/api/leave-request'],
    refreshRouter: true,
    onSuccess: () => {
      refetchRequests(); // Refresh the list
    },
  }
);

const handleDecision = async (
  id: string,
  action: 'approve' | 'decline'
) => {
  const result = await updateLeaveRequest({
    requestId: id,
    action,
  });

  if (result.success) {
    toast.success(`Leave ${action}d`);
  }
};
```

**Benefits:**
- ✅ Automatic cache invalidation via `invalidateKeys`
- ✅ Router refresh updates server components
- ✅ Manual refetch ensures immediate UI update
- ✅ Consistent error handling and toasts

#### Document Acknowledgements

See `app/components/documents/DocumentsPageClient.tsx`:

```typescript
// Fetch documents
const { data: documentsData, mutate: refetchDocuments } = useApi<Document[]>(
  '/api/documents/list'
);

// Mutation for acknowledging
const { trigger: acknowledgeDocument } = usePostMutation<
  any,
  { documentId: string }
>('/api/documents/acknowledge', {
  successMessage: 'Document acknowledged successfully',
  errorMessage: 'Failed to acknowledge document',
  invalidateKeys: ['/api/documents/list'],
  onSuccess: () => {
    setAcknowledged(true);
    setAckDate(new Date());
    setIsPreviewModalOpen(false);
    setShowAckSuccess(true);
    refetchDocuments();
  },
});

// Mutation for deleting
const { trigger: deleteDocument } = usePostMutation<
  any,
  { documentId: string }
>('/api/documents/delete', {
  successMessage: 'Document deleted successfully',
  errorMessage: 'Failed to delete document',
  invalidateKeys: ['/api/documents/list'],
  onSuccess: () => {
    refetchDocuments();
  },
});

// Usage
const handleAcknowledge = async () => {
  if (!selectedDoc) return;
  await acknowledgeDocument({ documentId: selectedDoc.id });
};

const handleDelete = async (id: string) => {
  if (!confirm('Delete this document?')) return;
  await deleteDocument({ documentId: id });
};
```

**Benefits:**
- ✅ Consistent toast notifications
- ✅ Automatic cache invalidation
- ✅ Success callbacks for UI updates
- ✅ Simplified error handling

#### Employee Edit Forms

For employee edit forms, use mutations with optimistic updates:

```typescript
import { usePutMutation } from '@/hooks/useMutationWithRefresh';

function EmployeeEditForm({ employeeId, initialData }: Props) {
  const [formData, setFormData] = useState(initialData);

  const { trigger: updateEmployee, isMutating } = usePutMutation<
    Employee,
    UpdateEmployeeDto
  >(
    `/api/employees/${employeeId}`,
    {
      successMessage: 'Employee updated successfully',
      errorMessage: 'Failed to update employee',
      invalidateKeys: [
        '/api/employees',
        `/api/employees/${employeeId}`,
      ],
      invalidatePattern: /^\/api\/employees\?/, // Invalidate paginated queries
      refreshRouter: true,
      refreshDelay: 500, // Wait 500ms before router refresh
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateEmployee(formData);
    
    if (result.success) {
      // Form submitted successfully
      router.push('/employees');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isMutating}>
        {isMutating ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

**Benefits:**
- ✅ Pattern-based cache invalidation for paginated data
- ✅ Router refresh with delay for smooth transitions
- ✅ Loading state management
- ✅ Automatic error surfacing

### Cache Invalidation Strategies

#### Specific Keys

Invalidate exact cache keys:

```typescript
{
  invalidateKeys: [
    '/api/employees',
    `/api/employees/${id}`,
    '/api/dashboard/metrics',
  ]
}
```

#### Pattern Matching

Invalidate all keys matching a pattern:

```typescript
{
  invalidatePattern: /^\/api\/employees\?/  // All paginated employee queries
}
```

#### Combined Approach

Use both for comprehensive invalidation:

```typescript
{
  invalidateKeys: ['/api/employees'],
  invalidatePattern: /^\/api\/employees\//  // All employee detail pages
}
```

### Error Handling

#### Automatic Error Toasts

Errors are automatically shown as toasts:

```typescript
const { trigger } = usePostMutation('/api/employees', {
  errorMessage: 'Failed to create employee', // Shown on error
});
```

#### Custom Error Handling

Handle errors programmatically:

```typescript
const { trigger } = usePostMutation('/api/employees', {
  errorMessage: false, // Disable automatic toast
  onError: (error) => {
    // Custom error handling
    if (error.message.includes('duplicate')) {
      toast.error('Employee already exists');
    } else {
      toast.error('An unexpected error occurred');
    }
  },
});
```

#### Error Recovery

```typescript
const result = await trigger(data);

if (!result.success) {
  // Retry logic
  if (shouldRetry(result.error)) {
    await trigger(data);
  }
}
```

### Loading States

#### Button States

```typescript
<button disabled={isMutating}>
  {isMutating ? (
    <>
      <Spinner className="mr-2" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</button>
```

#### Form States

```typescript
<form onSubmit={handleSubmit}>
  <fieldset disabled={isMutating}>
    {/* form fields */}
  </fieldset>
  <button type="submit" disabled={isMutating}>
    Submit
  </button>
</form>
```

#### Loading Toast

Show a toast during long operations:

```typescript
const { trigger } = usePostMutation('/api/bulk-import', {
  showLoadingToast: true,
  loadingMessage: 'Importing employees...',
  successMessage: 'Import complete',
});
```

### Best Practices

#### 1. Always Invalidate Related Caches

```typescript
// ✅ Good - invalidates list and detail
{
  invalidateKeys: ['/api/employees', `/api/employees/${id}`]
}

// ❌ Bad - only invalidates list
{
  invalidateKeys: ['/api/employees']
}
```

#### 2. Use Router Refresh for Server Components

```typescript
// ✅ Good - updates server-rendered data
{
  refreshRouter: true
}

// ❌ Bad - server components stay stale
{
  refreshRouter: false
}
```

#### 3. Provide Meaningful Messages

```typescript
// ✅ Good - specific and actionable
{
  successMessage: 'Employee John Doe created successfully',
  errorMessage: 'Failed to create employee. Please check the form and try again.'
}

// ❌ Bad - generic and unhelpful
{
  successMessage: 'Success',
  errorMessage: 'Error'
}
```

#### 4. Handle Loading States

```typescript
// ✅ Good - shows loading state
<button disabled={isMutating}>
  {isMutating ? 'Saving...' : 'Save'}
</button>

// ❌ Bad - no feedback
<button onClick={handleSave}>Save</button>
```

#### 5. Use Optimistic Updates for Better UX

```typescript
// ✅ Good - immediate feedback
const { trigger } = useOptimisticMutation(url, cacheKey, {
  optimisticData: updatedData,
});

// ⚠️ Acceptable - but slower UX
const { trigger } = usePostMutation(url, {
  onSuccess: () => mutate(cacheKey),
});
```

---

## Summary

The centralized API fetching and mutation system provides:

✅ **Type safety** - Full TypeScript support  
✅ **Automatic caching** - SWR handles caching and revalidation  
✅ **Error handling** - Consistent error structure  
✅ **Request deduplication** - Prevents redundant network calls  
✅ **Optimistic updates** - Better UX with immediate feedback  
✅ **Pagination support** - Built-in cursor-based pagination  
✅ **Batch requests** - Efficient multi-resource fetching  
✅ **Mutation helpers** - Unified POST/PUT/PATCH/DELETE with toasts and cache invalidation  
✅ **Router integration** - Automatic server component refresh  

**For GET requests:** Use `useApi` hook  
**For mutations:** Use `usePostMutation`, `usePutMutation`, `usePatchMutation`, or `useDeleteMutation` hooks  
**For non-React contexts:** Use `apiClient` and mutation helpers from `lib/mutations.ts`  

For questions or issues, refer to:
- `lib/apiClient.ts` - Core API client
- `app/hooks/useApi.ts` - React hooks for data fetching
- `lib/mutations.ts` - Mutation utilities
- `app/hooks/useMutationWithRefresh.ts` - React hooks for mutations
