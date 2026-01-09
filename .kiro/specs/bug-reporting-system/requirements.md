# Requirements Document

## Introduction

This document specifies the requirements for a Bug Reporting System designed for beta users of the PeopleCore HRIS platform. The system enables beta users to submit bug reports directly from the application, provides a user-facing dashboard to track submitted bugs, and offers a comprehensive tenant admin dashboard for system-wide bug management. The feature is controlled by a feature toggle to limit visibility to beta tenants only.

## Glossary

- **Bug_Report**: A record containing details about a software issue submitted by a user, including title, description, steps to reproduce, severity, and auto-captured metadata.
- **Bug_Submission_Modal**: A dialog component that allows users to submit bug reports with structured fields.
- **User_Bug_Dashboard**: A page accessible to users within a tenant showing all bugs submitted by that tenant.
- **Tenant_Admin_Bug_Dashboard**: A page at `/tenant-admin/bugs` accessible only to users with `canManageTenants` permission, showing all bugs across all tenants.
- **Feature_Toggle_Service**: The existing service (`lib/feature-toggles/service.ts`) that controls feature availability per tenant.
- **Severity**: A classification of bug impact: CRITICAL, HIGH, MEDIUM, LOW.
- **Bug_Status**: The current state of a bug report: OPEN, IN_PROGRESS, RESOLVED, CLOSED, WONT_FIX.
- **Tenant**: A company/organisation using the platform, identified by `companyId`.
- **Tenant_Admin**: A user with `canManageTenants` permission who can access the tenant admin portal.
- **Submitter**: The user who created a bug report.
- **Admin_Notes**: Internal notes added by tenant admins that are not visible to regular users.

## Requirements

### Requirement 1: Feature Toggle Control

**User Story:** As a product manager, I want the bug reporting feature to be controlled by a feature toggle, so that I can enable it only for beta tenants.

#### Acceptance Criteria

1. THE Feature_Toggle_Service SHALL include a new feature key `BUG_REPORTING` in the feature toggle types.
2. WHEN the `BUG_REPORTING` feature is disabled for a tenant, THE System SHALL hide the "Report a Bug" button from all users in that tenant.
3. WHEN the `BUG_REPORTING` feature is disabled for a tenant, THE System SHALL return 403 Forbidden for any bug-related API requests from that tenant.
4. WHEN a new tenant is created, THE System SHALL default the `BUG_REPORTING` feature to disabled.
5. THE Tenant_Admin_Bug_Dashboard SHALL be accessible regardless of individual tenant feature toggle states.

### Requirement 2: Bug Submission Modal

**User Story:** As a beta user, I want to submit bug reports through a modal dialog, so that I can report issues without leaving my current workflow.

#### Acceptance Criteria

1. WHEN the `BUG_REPORTING` feature is enabled for a tenant, THE System SHALL display a "Report a Bug" button in the application header or sidebar.
2. WHEN a user clicks the "Report a Bug" button, THE Bug_Submission_Modal SHALL open with the following fields:
   - Title (required, text, max 200 characters)
   - Description (required, textarea, max 5000 characters)
   - Steps to Reproduce (optional, textarea, max 3000 characters)
   - Severity (required, dropdown: CRITICAL, HIGH, MEDIUM, LOW)
   - Attachments (optional, file upload, max 5 files, max 10MB each)
3. WHEN the modal opens, THE System SHALL auto-capture and store the following metadata:
   - User ID of the submitter
   - Tenant ID (companyId)
   - Current page URL
   - Timestamp of submission
   - Browser user agent
4. WHEN a user submits a valid bug report, THE System SHALL create a Bug_Report record and display a success confirmation.
5. IF a user attempts to submit a bug report with missing required fields, THEN THE System SHALL display validation errors and prevent submission.
6. WHEN a user clicks cancel or outside the modal, THE System SHALL close the modal without saving.

### Requirement 3: Bug Report Storage

**User Story:** As a system architect, I want bug reports stored in a structured database schema, so that they can be queried, filtered, and managed efficiently.

#### Acceptance Criteria

1. THE System SHALL store Bug_Report records with the following fields:
   - id (unique identifier)
   - title (string, required)
   - description (text, required)
   - stepsToReproduce (text, optional)
   - severity (enum: CRITICAL, HIGH, MEDIUM, LOW)
   - status (enum: OPEN, IN_PROGRESS, RESOLVED, CLOSED, WONT_FIX, default: OPEN)
   - submitterId (foreign key to User)
   - companyId (foreign key to Company)
   - pageUrl (string)
   - userAgent (string)
   - adminNotes (text, optional)
   - resolvedAt (datetime, optional)
   - createdAt (datetime)
   - updatedAt (datetime)
2. THE System SHALL store Bug_Attachment records linked to Bug_Report with:
   - id (unique identifier)
   - bugReportId (foreign key to Bug_Report)
   - fileName (string)
   - fileSize (integer)
   - mimeType (string)
   - storagePath (string)
   - createdAt (datetime)
3. THE System SHALL create database indexes on companyId, status, severity, and createdAt for efficient querying.

### Requirement 4: Bug Submission API

**User Story:** As a developer, I want a secure API endpoint for bug submission, so that the frontend can create bug reports with proper validation and authorization.

#### Acceptance Criteria

1. THE System SHALL expose a POST `/api/bugs` endpoint for creating bug reports.
2. WHEN a request is received, THE System SHALL verify the user is authenticated and belongs to a tenant with `BUG_REPORTING` enabled.
3. WHEN a valid bug report is submitted, THE System SHALL return 201 Created with the created bug report data.
4. IF the request body fails validation, THEN THE System SHALL return 400 Bad Request with validation error details.
5. IF the user is not authenticated, THEN THE System SHALL return 401 Unauthorized.
6. IF the tenant does not have `BUG_REPORTING` enabled, THEN THE System SHALL return 403 Forbidden.
7. THE System SHALL sanitize all text inputs to prevent XSS attacks.
8. THE System SHALL enforce tenant isolation by automatically setting companyId from the authenticated user's session.

### Requirement 5: User Bug Dashboard

**User Story:** As a beta user, I want to view all bugs submitted by my organisation, so that I can track the status of reported issues.

#### Acceptance Criteria

1. WHEN the `BUG_REPORTING` feature is enabled for a tenant, THE System SHALL provide a "Bug Reports" page accessible from the navigation.
2. THE User_Bug_Dashboard SHALL display a table with columns: Title, Status, Severity, Date Submitted, Resolved Date, Comments Count.
3. THE User_Bug_Dashboard SHALL only show Bug_Reports belonging to the current user's tenant (companyId).
4. THE User_Bug_Dashboard SHALL support sorting by Date Submitted (default: newest first), Status, and Severity.
5. THE User_Bug_Dashboard SHALL support filtering by Status and Severity.
6. WHEN a user clicks on a bug report row, THE System SHALL display a detail view showing all bug information except adminNotes.
7. THE System SHALL paginate results with 20 items per page.

### Requirement 6: User Bug Dashboard API

**User Story:** As a developer, I want API endpoints for the user bug dashboard, so that users can retrieve their tenant's bug reports securely.

#### Acceptance Criteria

1. THE System SHALL expose a GET `/api/bugs` endpoint for listing bug reports.
2. WHEN a request is received, THE System SHALL return only Bug_Reports where companyId matches the authenticated user's companyId.
3. THE System SHALL support query parameters: status, severity, page, limit, sortBy, sortOrder.
4. THE System SHALL expose a GET `/api/bugs/[id]` endpoint for retrieving a single bug report.
5. WHEN retrieving a single bug report, THE System SHALL verify the bug belongs to the user's tenant before returning data.
6. THE System SHALL exclude adminNotes from responses to non-tenant-admin users.

### Requirement 7: Tenant Admin Bug Dashboard

**User Story:** As a tenant admin, I want to view and manage all bugs across all tenants, so that I can prioritise and track issues system-wide.

#### Acceptance Criteria

1. THE System SHALL provide a Tenant_Admin_Bug_Dashboard at `/tenant-admin/bugs`.
2. THE Tenant_Admin_Bug_Dashboard SHALL only be accessible to users with `canManageTenants` permission.
3. THE Tenant_Admin_Bug_Dashboard SHALL display a table with columns: Bug ID, Title, Tenant Name, Submitted By, Status, Severity, Date Submitted, Date Resolved, Comments Count.
4. THE Tenant_Admin_Bug_Dashboard SHALL support filtering by: Tenant, Status, Severity, Date Range.
5. THE Tenant_Admin_Bug_Dashboard SHALL support sorting by any column.
6. WHEN a tenant admin clicks on a bug report, THE System SHALL display a detail view with all information including adminNotes.
7. THE Tenant_Admin_Bug_Dashboard SHALL display aggregate statistics: Total Bugs, Open Bugs, Bugs by Severity, Bugs by Tenant.

### Requirement 8: Tenant Admin Bug Management API

**User Story:** As a developer, I want API endpoints for tenant admin bug management, so that admins can view and update bugs across all tenants.

#### Acceptance Criteria

1. THE System SHALL expose a GET `/api/tenant-admin/bugs` endpoint for listing all bugs across tenants.
2. WHEN a request is received, THE System SHALL verify the user has `canManageTenants` permission.
3. THE System SHALL support query parameters: companyId, status, severity, dateFrom, dateTo, page, limit, sortBy, sortOrder.
4. THE System SHALL expose a PATCH `/api/tenant-admin/bugs/[id]` endpoint for updating bug status and adminNotes.
5. WHEN updating a bug, THE System SHALL only allow updating: status, adminNotes, resolvedAt.
6. WHEN status is changed to RESOLVED or CLOSED, THE System SHALL automatically set resolvedAt if not already set.
7. IF a non-tenant-admin user attempts to access these endpoints, THEN THE System SHALL return 403 Forbidden.

### Requirement 9: Security and Tenant Isolation

**User Story:** As a security engineer, I want strict tenant isolation and access controls, so that bug data is protected and users can only access appropriate information.

#### Acceptance Criteria

1. THE System SHALL enforce tenant isolation on all bug-related queries by filtering on companyId.
2. THE System SHALL validate that the authenticated user's companyId matches the bug's companyId for all user-facing operations.
3. THE System SHALL require `canManageTenants` permission for all tenant-admin bug endpoints.
4. THE System SHALL log all bug status changes to the GlobalAuditLog.
5. THE System SHALL sanitize all user inputs to prevent SQL injection and XSS attacks.
6. THE System SHALL validate file uploads for allowed MIME types (images, PDFs, text files).
7. THE System SHALL store attachments in a secure cloud storage location with access controls.

### Requirement 10: Attachment Handling

**User Story:** As a beta user, I want to attach screenshots and files to my bug reports, so that I can provide visual evidence of issues.

#### Acceptance Criteria

1. THE Bug_Submission_Modal SHALL allow uploading up to 5 attachments per bug report.
2. THE System SHALL accept files with MIME types: image/png, image/jpeg, image/gif, image/webp, application/pdf, text/plain.
3. THE System SHALL reject files larger than 10MB each.
4. WHEN a file is uploaded, THE System SHALL store it in cloud storage and save the reference in Bug_Attachment.
5. THE System SHALL generate secure, time-limited URLs for attachment downloads.
6. WHEN a bug report is deleted, THE System SHALL also delete associated attachments from storage.

### Requirement 11: Bug Comments (Optional Enhancement)

**User Story:** As a user, I want to add comments to bug reports, so that I can provide additional information or ask questions about status.

#### Acceptance Criteria

1. THE System SHALL allow users to add comments to bug reports belonging to their tenant.
2. THE System SHALL store Bug_Comment records with: id, bugReportId, authorId, content, createdAt.
3. THE System SHALL display comments in chronological order on the bug detail view.
4. THE System SHALL allow tenant admins to add comments to any bug report.
5. THE System SHALL support marking comments as "admin only" (visible only to tenant admins).

### Requirement 12: Email Notifications (Optional Enhancement)

**User Story:** As a user, I want to receive email notifications when my bug report status changes, so that I stay informed about issue resolution.

#### Acceptance Criteria

1. WHEN a bug report status changes, THE System SHALL send an email notification to the submitter.
2. THE email SHALL include: Bug title, Old status, New status, Link to view the bug.
3. THE System SHALL respect user email preferences for notification opt-out.
4. THE System SHALL use the existing email infrastructure (Resend) for sending notifications.
