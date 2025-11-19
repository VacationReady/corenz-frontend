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

## Summary

The centralized API fetching system provides:

✅ **Type safety** - Full TypeScript support  
✅ **Automatic caching** - SWR handles caching and revalidation  
✅ **Error handling** - Consistent error structure  
✅ **Request deduplication** - Prevents redundant network calls  
✅ **Optimistic updates** - Better UX with immediate feedback  
✅ **Pagination support** - Built-in cursor-based pagination  
✅ **Batch requests** - Efficient multi-resource fetching  

Use `useApi` for GET requests, `useApiMutation` for mutations, and `apiClient` for non-React contexts.

For questions or issues, refer to the source code in `lib/apiClient.ts` and `app/hooks/useApi.ts`.
