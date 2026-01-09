# Design Document: Bug Reporting System

## Overview

This document describes the technical design for a Bug Reporting System that enables beta users to submit, track, and manage bug reports within the PeopleCore HRIS platform. The system integrates with the existing feature toggle infrastructure to control visibility, follows established patterns for tenant isolation and role-based access, and provides both user-facing and tenant admin dashboards.

The design prioritises security (tenant isolation, input sanitization), user experience (minimal friction bug submission), and maintainability (following existing codebase patterns).

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        BM[Bug Submission Modal]
        UD[User Bug Dashboard]
        AD[Tenant Admin Dashboard]
        FT[Feature Toggle Hook]
    end
    
    subgraph "API Layer"
        BA[/api/bugs]
        BAD[/api/bugs/:id]
        TAB[/api/tenant-admin/bugs]
        TABD[/api/tenant-admin/bugs/:id]
    end
    
    subgraph "Services"
        FTS[Feature Toggle Service]
        BS[Bug Service]
        AS[Attachment Service]
        NS[Notification Service]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        S3[Cloud Storage]
    end
    
    BM --> BA
    UD --> BA
    UD --> BAD
    AD --> TAB
    AD --> TABD
    
    BA --> FTS
    BA --> BS
    BA --> AS
    
    TAB --> BS
    TABD --> BS
    TABD --> NS
    
    BS --> DB
    AS --> S3
    AS --> DB
    
    FT --> FTS
```

## Components and Interfaces

### 1. Feature Toggle Extension

Extend the existing feature toggle system to include bug reporting:

```typescript
// lib/feature-toggles/types.ts - Addition
export const FEATURE_KEYS = {
  // ... existing keys
  BUG_REPORTING: 'bug_reporting',
} as const;

// Add to FEATURE_CATEGORIES
{
  name: 'Beta Features',
  description: 'Features in beta testing',
  features: [
    { key: FEATURE_KEYS.BUG_REPORTING, label: 'Bug Reporting', description: 'Allow users to submit bug reports' },
  ],
}

// Add to FEATURE_TO_PATHS
[FEATURE_KEYS.BUG_REPORTING]: ['/bugs', '/api/bugs'],
```

### 2. Bug Submission Modal Component

```typescript
// app/components/bugs/BugSubmissionModal.tsx
interface BugSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bug: BugReport) => void;
}

interface BugFormData {
  title: string;           // max 200 chars
  description: string;     // max 5000 chars
  stepsToReproduce?: string; // max 3000 chars
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  attachments?: File[];    // max 5 files, 10MB each
}

// Auto-captured metadata (not user-editable)
interface BugMetadata {
  submitterId: string;
  companyId: string;
  pageUrl: string;
  userAgent: string;
  timestamp: Date;
}
```

### 3. Bug Report Button Component

```typescript
// app/components/bugs/ReportBugButton.tsx
// Conditionally rendered based on feature toggle
// Placed in the ADMIN header (top navigation bar)
// Only visible to users with ADMIN or MANAGER role
// Opens BugSubmissionModal on click

interface ReportBugButtonProps {
  className?: string;
}

// Button styling: subtle, non-intrusive icon button with tooltip
// Uses Bug icon from lucide-react
// Hover state shows "Report a Bug" tooltip
```

### 4. User Bug Dashboard Page

```typescript
// app/(withSidebar)/bugs/page.tsx
// Protected by FeatureGuardedPage with BUG_REPORTING feature
// Displays BugReportTable component
// Supports filtering, sorting, pagination
```

### 5. Tenant Admin Bug Dashboard Page

```typescript
// app/tenant-admin/bugs/page.tsx
// Protected by canManageTenants check
// Modern glass-morphism design matching existing tenant admin portal

// Layout Structure:
// 1. Header with title "Bug Reports" and refresh button
// 2. Stats row with glass cards:
//    - Total Bugs (purple icon)
//    - Open Bugs (red icon)  
//    - In Progress (amber icon)
//    - Resolved (green icon)
// 3. Filter bar with dropdowns: Tenant, Status, Severity, Date Range
// 4. Modern table with:
//    - Hover effects (hover-glass)
//    - Status badges with color coding
//    - Severity badges
//    - Click to open detail panel
// 5. Slide-out detail panel for reviewing/updating bugs:
//    - Full bug details
//    - Admin notes textarea
//    - Status dropdown
//    - Save/Cancel buttons
//    - Attachment previews

// Design tokens (matching existing tenant admin):
// - glass: backdrop-blur with subtle border
// - rounded-2xl/3xl for cards
// - shadow-glass for depth
// - transition-glass for smooth interactions
// - Color palette: purple (primary), emerald (success), red (critical), amber (warning)
```

### 6. API Endpoints

#### User Bug Endpoints

```typescript
// POST /api/bugs - Create bug report
interface CreateBugRequest {
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: BugSeverity;
}
// Response: 201 Created with BugReport

// GET /api/bugs - List bugs for current tenant
interface ListBugsQuery {
  status?: BugStatus;
  severity?: BugSeverity;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'status' | 'severity';
  sortOrder?: 'asc' | 'desc';
}
// Response: { bugs: BugReport[], total: number, page: number }

// GET /api/bugs/[id] - Get single bug (tenant-scoped)
// Response: BugReport (excludes adminNotes)
```

#### Tenant Admin Bug Endpoints

```typescript
// GET /api/tenant-admin/bugs - List all bugs across tenants
interface AdminListBugsQuery extends ListBugsQuery {
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
}
// Response: { bugs: BugReportWithTenant[], total: number, stats: BugStats }

// PATCH /api/tenant-admin/bugs/[id] - Update bug
interface UpdateBugRequest {
  status?: BugStatus;
  adminNotes?: string;
}
// Response: BugReport
```

#### Attachment Endpoints

```typescript
// POST /api/bugs/[id]/attachments - Upload attachment
// Multipart form data with file
// Response: BugAttachment

// GET /api/bugs/attachments/[id]/download - Get signed download URL
// Response: { url: string, expiresAt: Date }
```

## Data Models

### Prisma Schema

```prisma
enum BugSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum BugStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
  WONT_FIX
}

model BugReport {
  id               String          @id @default(cuid())
  title            String          @db.VarChar(200)
  description      String          @db.Text
  stepsToReproduce String?         @db.Text
  severity         BugSeverity
  status           BugStatus       @default(OPEN)
  pageUrl          String
  userAgent        String
  adminNotes       String?         @db.Text
  resolvedAt       DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  
  submitterId      String
  companyId        String
  
  Submitter        User            @relation(fields: [submitterId], references: [id])
  Company          Company         @relation(fields: [companyId], references: [id])
  Attachments      BugAttachment[]
  Comments         BugComment[]
  
  @@index([companyId, status])
  @@index([companyId, severity])
  @@index([companyId, createdAt])
  @@index([status, severity])
}

model BugAttachment {
  id           String    @id @default(cuid())
  bugReportId  String
  fileName     String
  fileSize     Int
  mimeType     String
  storagePath  String
  createdAt    DateTime  @default(now())
  
  BugReport    BugReport @relation(fields: [bugReportId], references: [id], onDelete: Cascade)
  
  @@index([bugReportId])
}

model BugComment {
  id           String    @id @default(cuid())
  bugReportId  String
  authorId     String
  content      String    @db.Text
  isAdminOnly  Boolean   @default(false)
  createdAt    DateTime  @default(now())
  
  BugReport    BugReport @relation(fields: [bugReportId], references: [id], onDelete: Cascade)
  Author       User      @relation(fields: [authorId], references: [id])
  
  @@index([bugReportId, createdAt])
}
```

### TypeScript Types

```typescript
// app/types/bugs.ts
export interface BugReport {
  id: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: BugSeverity;
  status: BugStatus;
  pageUrl: string;
  userAgent: string;
  adminNotes?: string; // Only included for tenant admins
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  submitterId: string;
  companyId: string;
  submitter?: {
    id: string;
    name: string;
    email: string;
  };
  company?: {
    id: string;
    name: string;
  };
  attachments?: BugAttachment[];
  comments?: BugComment[];
  _count?: {
    comments: number;
    attachments: number;
  };
}

export interface BugStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  bySeverity: Record<BugSeverity, number>;
  byTenant: Array<{ companyId: string; companyName: string; count: number }>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tenant Isolation for User Bug Queries

*For any* authenticated user making a request to the user bug endpoints (`/api/bugs`, `/api/bugs/[id]`), the response SHALL only contain bug reports where `companyId` matches the user's `companyId` from their session.

**Validates: Requirements 5.3, 6.2, 6.5, 9.1, 9.2**

### Property 2: Feature Toggle Enforcement

*For any* request to bug-related endpoints (`/api/bugs/*`) from a tenant where `BUG_REPORTING` feature is disabled, the system SHALL return 403 Forbidden.

**Validates: Requirements 1.3, 4.6**

### Property 3: Tenant Admin Permission Enforcement

*For any* request to tenant admin bug endpoints (`/api/tenant-admin/bugs/*`) from a user without `canManageTenants` permission, the system SHALL return 403 Forbidden.

**Validates: Requirements 7.2, 8.2, 8.7, 9.3**

### Property 4: Admin Notes Exclusion for Non-Admins

*For any* bug report response to a non-tenant-admin user, the `adminNotes` field SHALL be excluded or null, regardless of whether the bug has admin notes stored.

**Validates: Requirements 5.6, 6.6**

### Property 5: Input Sanitization

*For any* text input (title, description, stepsToReproduce, adminNotes, comment content) containing potential XSS payloads or SQL injection patterns, the stored and returned value SHALL be sanitized to prevent script execution.

**Validates: Requirements 4.7, 9.5**

### Property 6: Bug Creation Validation

*For any* bug creation request missing required fields (title, description, severity) or with fields exceeding length limits, the system SHALL return 400 Bad Request and not create a record.

**Validates: Requirements 2.5, 4.4**

### Property 7: Valid Bug Creation

*For any* valid bug creation request with all required fields within limits, the system SHALL create a BugReport record with `companyId` matching the authenticated user's company and return 201 Created.

**Validates: Requirements 2.4, 4.3, 4.8**

### Property 8: Attachment MIME Type Validation

*For any* file upload with a MIME type not in the allowed list (image/png, image/jpeg, image/gif, image/webp, application/pdf, text/plain), the system SHALL reject the upload with 400 Bad Request.

**Validates: Requirements 9.6, 10.2**

### Property 9: Attachment Size Validation

*For any* file upload larger than 10MB, the system SHALL reject the upload with 400 Bad Request.

**Validates: Requirements 10.3**

### Property 10: Attachment Count Limit

*For any* bug report, attempting to add more than 5 attachments SHALL be rejected with 400 Bad Request.

**Validates: Requirements 10.1**

### Property 11: Status Change Audit Logging

*For any* bug status change, the system SHALL create a GlobalAuditLog entry containing the bug ID, old status, new status, and actor ID.

**Validates: Requirements 9.4**

### Property 12: Resolved Date Auto-Population

*For any* bug status update to RESOLVED or CLOSED where `resolvedAt` is not already set, the system SHALL automatically set `resolvedAt` to the current timestamp.

**Validates: Requirements 8.6**

### Property 13: Bug Sorting Correctness

*For any* list bugs request with a sortBy parameter, the returned bugs SHALL be ordered according to the specified field and sortOrder.

**Validates: Requirements 5.4, 7.5**

### Property 14: Bug Filtering Correctness

*For any* list bugs request with filter parameters (status, severity), all returned bugs SHALL match the specified filter criteria.

**Validates: Requirements 5.5, 7.4**

### Property 15: Pagination Correctness

*For any* list bugs request with page and limit parameters, the returned results SHALL contain at most `limit` items and represent the correct page offset.

**Validates: Requirements 5.7**

### Property 16: Comment Tenant Isolation

*For any* user attempting to add a comment to a bug report, the operation SHALL only succeed if the bug's `companyId` matches the user's `companyId` OR the user has `canManageTenants` permission.

**Validates: Requirements 11.1, 11.4**

### Property 17: Admin-Only Comment Visibility

*For any* comment marked as `isAdminOnly: true`, the comment SHALL be excluded from responses to users without `canManageTenants` permission.

**Validates: Requirements 11.5**

### Property 18: Cascade Attachment Deletion

*For any* bug report deletion, all associated BugAttachment records and their corresponding cloud storage files SHALL be deleted.

**Validates: Requirements 10.6**

## Error Handling

### API Error Responses

All API endpoints follow a consistent error response format:

```typescript
interface ApiError {
  error: string;
  code: string;
  details?: Record<string, string[]>; // Field-level validation errors
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User lacks permission or feature disabled |
| `NOT_FOUND` | 404 | Bug report not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `FILE_TOO_LARGE` | 400 | Attachment exceeds 10MB |
| `INVALID_FILE_TYPE` | 400 | Attachment MIME type not allowed |
| `TOO_MANY_ATTACHMENTS` | 400 | Bug already has 5 attachments |
| `TENANT_MISMATCH` | 403 | Bug belongs to different tenant |

### Error Handling Strategy

1. **Validation Errors**: Return 400 with detailed field-level errors
2. **Authentication Errors**: Return 401 with redirect to login
3. **Authorization Errors**: Return 403 with clear message
4. **Not Found**: Return 404 for missing resources
5. **Server Errors**: Return 500, log full error, return generic message to client

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

- Feature toggle key existence and configuration
- Input validation functions (title length, description length, etc.)
- MIME type validation
- File size validation
- Sanitization functions
- Date formatting utilities

### Property-Based Tests

Property-based tests verify universal properties across generated inputs using fast-check:

- **Tenant isolation**: Generate random users and bugs, verify access control
- **Input sanitization**: Generate strings with XSS payloads, verify sanitization
- **Validation**: Generate invalid inputs, verify rejection
- **Sorting**: Generate bug lists, verify sort order
- **Filtering**: Generate bugs with various statuses/severities, verify filter accuracy

**Configuration**: Minimum 100 iterations per property test.

**Testing Framework**: Jest with fast-check for property-based testing.

### Integration Tests

- API endpoint authentication and authorization
- Database operations (CRUD)
- Feature toggle integration
- Attachment upload/download flow

### Test File Structure

```
tests/
├── bugs/
│   ├── bug-api.test.ts           # API endpoint tests
│   ├── bug-service.test.ts       # Service layer tests
│   ├── bug-validation.test.ts    # Validation function tests
│   ├── bug-tenant-isolation.property.test.ts  # Property: tenant isolation
│   ├── bug-sanitization.property.test.ts      # Property: input sanitization
│   └── bug-attachments.test.ts   # Attachment handling tests
├── tenant-admin/
│   └── bugs-admin-api.test.ts    # Tenant admin endpoint tests
```

## Security Considerations

### Tenant Isolation

- All user-facing queries include `companyId` filter from session
- Bug IDs are CUIDs (not sequential) to prevent enumeration
- Cross-tenant access attempts logged to audit log

### Input Sanitization

- Use DOMPurify for HTML sanitization
- Parameterized queries via Prisma (SQL injection prevention)
- Content-Security-Policy headers

### File Upload Security

- Validate MIME type from file content, not just extension
- Scan for malware (future enhancement)
- Store in isolated cloud storage bucket
- Generate time-limited signed URLs for downloads

### Rate Limiting

- Bug creation: 10 per hour per user
- Attachment upload: 20 per hour per user
- API requests: 100 per minute per user

### Audit Logging

- All status changes logged to GlobalAuditLog
- Include actor, timestamp, old/new values
- Retain logs for compliance period
