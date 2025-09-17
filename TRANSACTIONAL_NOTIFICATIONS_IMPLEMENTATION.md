# Transactional Notification System Implementation

## Overview
This document summarizes the implementation of a comprehensive transactional notification system for employee audit events in the PeopleCore HR platform. The system allows administrators to configure email notifications whenever employee records are updated.

## Features Implemented

### 1. Data Model (`prisma/schema.prisma`)
- **TransactionalNotificationPreference**: Stores notification preferences per company and section
  - `companyId`: Links to company
  - `section`: Identifies the employee section (e.g., "personal-info", "forms:abc123")
  - `notifyAdmin`: Boolean flag for admin notifications
  - `notifyManager`: Boolean flag for manager notifications  
  - `notifyEmployee`: Boolean flag for employee notifications
  - Unique constraint on `[companyId, section]` for multi-tenancy

### 2. Shared Helpers

#### Audit Field Labels (`app/lib/audit-field-labels.ts`)
- Extracted field label mappings from ChangeReasonModal
- `labelForField()`: Returns human-readable labels for audit fields
- `formatAuditValue()`: Formats values (dates, booleans, nulls)
- `titleCaseFromKey()`: Converts field keys to title case

#### Transactional Notifications (`app/lib/transactional-notifications.ts`)
- **BASE_TRANSACTIONAL_SECTIONS**: Defines all audit sections with metadata
  - Core Profile: personal-info, bank-payroll, employment-details, emergency-contacts
  - Compliance: driver-licenses, employment-checks, training
  - Forms: Dynamic form submissions
- **resolveTransactionalPreference()**: Resolves preferences with fallback logic
  - Exact match first, then base section (e.g., forms:abc → forms)
- **buildTransactionalEmail()**: Creates rich HTML/text emails with:
  - Beautiful gradient headers
  - Formatted change tables with field labels
  - Highlighted create/delete events
  - Proper date/boolean formatting
  - Plain text alternative for accessibility
- **dispatchTransactionalNotifications()**: Main dispatcher that:
  - Resolves notification preferences
  - Fetches employee, actor, and admin data
  - Builds deduplicated recipient list
  - Sends formatted emails via Resend
  - Handles errors gracefully

### 3. Audit Pipeline Integration (`app/lib/audit-helpers.ts`)
- Extended `createAuditLogs()` with optional `skipNotifications` parameter
- Automatically dispatches notifications after audit log creation
- Error handling ensures audit logs succeed even if notifications fail
- Maintains backward compatibility with existing callers

### 4. API Endpoints (`app/api/transactional-notifications/route.ts`)

#### GET /api/transactional-notifications
- Returns grouped preferences with metadata
- Merges stored preferences with base configuration
- Dynamically includes active forms
- Admin-only access control

#### PUT /api/transactional-notifications  
- Updates notification preferences
- Upserts new/modified preferences
- Cleans up stale form-specific entries
- Transactional consistency

### 5. Settings UI (`app/(withSidebar)/settings/workflows/notifications/page.tsx`)
- Admin-accessible from Settings → Workflows → Transactional Notifications
- Grouped accordion interface (Core Profile, Compliance, Forms)
- Switch controls for Admin/Manager/Employee toggles
- "Apply to all" bulk actions
- Visual indicators for default vs. custom settings
- Dirty state tracking with save/discard options
- Loading skeletons and error handling
- Links to view actual employee sections

### 6. Email Template Polish
- **HTML Email Features**:
  - Responsive design with max-width container
  - Gradient header backgrounds
  - Color-coded changes (green for new, red for deleted, yellow for cleared)
  - Professional typography and spacing
  - Call-to-action button to view employee record
  - Localized date formatting (en-NZ)
- **Plain Text Alternative**:
  - Structured with clear sections
  - ASCII formatting for readability
  - Full change details included

### 7. Testing Suite
Three comprehensive test files covering:
- **transactionalNotifications.test.ts**: Core notification logic
  - Preference resolution with fallback
  - Email building with various field types
  - Recipient deduplication
  - Error handling
- **transactionalNotificationsRoute.test.ts**: API endpoint testing
  - Authentication and authorization
  - Request validation
  - Database operations
  - Error scenarios
- **auditLogsNotificationIntegration.test.ts**: Integration testing
  - Audit log creation with notifications
  - Skip notifications option
  - Error recovery

## Multi-Tenancy Considerations
- All preferences are scoped by `companyId`
- Session-based company isolation in API routes
- Efficient database indexes for tenant queries
- No cross-tenant data leakage

## Scalability Features
- Asynchronous email sending
- Graceful error handling (logs don't fail if email fails)
- Efficient recipient deduplication
- Minimal database queries with parallel fetching
- Form-specific preferences with inheritance

## Migration Path
1. Run `npx prisma migrate deploy` to apply schema changes
2. Default behavior: Admin-only notifications (backward compatible)
3. Admins can customize per their needs via Settings UI
4. Existing audit logs continue working unchanged

## Usage Example
When an employee's personal information is updated:
1. Audit system calls `createAuditLogs()` with changes and reasons
2. System checks TransactionalNotificationPreference for "personal-info"
3. If enabled, fetches employee, actor, and configured recipients
4. Sends beautifully formatted email with change details
5. Recipients can click through to view the full employee record

## Future Enhancements
- Webhook notifications for external systems
- Slack/Teams integration
- Notification templates per section
- Digest mode for batch changes
- Audit log viewer in UI
- Custom recipient lists per section

## Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `RESEND_API_KEY`: Resend API key for email sending
- `FROM_EMAIL` or `EMAIL_FROM`: Sender email address (defaults to noreply@peoplecore.co.nz)
- `NEXT_PUBLIC_APP_URL`: Application URL for email links
