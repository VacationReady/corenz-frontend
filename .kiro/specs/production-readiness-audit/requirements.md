# Requirements Document

## Introduction

This document defines the requirements for a comprehensive production readiness audit of PeopleCore HRIS. The audit focuses on 7 core modules planned for initial production release: Employees, Dashboards, Reports, Surveys, News, Leave Booking & Calendars, and Documents.

## Glossary

- **Tenant**: A company/organization using the HRIS system; data must be isolated between tenants
- **RBAC**: Role-Based Access Control - permission system based on user roles (ADMIN, MANAGER, EMPLOYEE)
- **Permission_Profile**: Custom permission configuration that can override default role permissions
- **companyId**: The unique identifier used for tenant isolation in all database queries
- **Session**: Authenticated user context containing userId, companyId, and role

## Requirements

### Requirement 1: Authentication Security

**User Story:** As a system administrator, I want all API endpoints to require valid authentication, so that unauthorized users cannot access system data.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made to any API endpoint, THE System SHALL return a 401 Unauthorized response
2. WHEN a session token is expired or invalid, THE System SHALL reject the request with 401 status
3. THE System SHALL support both web sessions (NextAuth) and mobile sessions (getMobileSession)

### Requirement 2: Tenant Isolation

**User Story:** As a tenant administrator, I want my company's data to be completely isolated from other tenants, so that there is no risk of data leakage.

#### Acceptance Criteria

1. THE System SHALL include companyId filter in ALL database queries for tenant-scoped resources
2. WHEN a user attempts to access a resource from another tenant, THE System SHALL return 404 (not 403) to prevent ID enumeration
3. THE System SHALL validate that referenced resources (departments, job roles, employees) belong to the same tenant before creating relationships
4. WHEN processing bulk operations, THE System SHALL validate each record belongs to the authenticated tenant

### Requirement 3: Role-Based Access Control

**User Story:** As an HR administrator, I want users to only access data appropriate to their role, so that sensitive information is protected.

#### Acceptance Criteria

1. WHEN an ADMIN or SUPER_ADMIN user makes a request, THE System SHALL grant full access to company resources
2. WHEN a MANAGER user requests employee data, THE System SHALL only return their direct/indirect reports and department colleagues
3. WHEN an EMPLOYEE user requests employee data, THE System SHALL only return their own data and department colleagues (limited fields)
4. THE System SHALL check permission profiles before role-based defaults when determining access

### Requirement 4: Employees Module Security

**User Story:** As an HR administrator, I want the employees module to be secure and properly access-controlled, so that employee data is protected.

#### Acceptance Criteria

1. THE Employees_API SHALL validate companyId on all CRUD operations
2. WHEN creating an employee, THE System SHALL validate email uniqueness globally (cross-tenant)
3. WHEN a manager ID is provided, THE System SHALL validate the manager exists in the same tenant
4. THE System SHALL use cursor-based pagination with a maximum limit of 100 records per page
5. WHEN an employee is deleted, THE System SHALL properly cascade or handle related records

### Requirement 5: Documents Module Security

**User Story:** As an HR administrator, I want document access to be properly controlled based on visibility settings, so that sensitive documents are only seen by authorized users.

#### Acceptance Criteria

1. THE Documents_API SHALL validate companyId on all operations
2. WHEN uploading a document, THE System SHALL validate file type against an allowlist (PDF, PNG, JPEG, DOC, DOCX)
3. WHEN uploading a document, THE System SHALL enforce a maximum file size of 10MB
4. THE System SHALL generate signed URLs with 5-minute expiry for document downloads
5. WHEN a document has department/job role restrictions, THE System SHALL only show it to users matching those criteria
6. THE System SHALL respect canViewAdmin, canViewManager, canViewEmployee visibility flags

### Requirement 6: Leave & Calendar Module Security

**User Story:** As an employee, I want my sickness leave to be private from colleagues, so that my health information is protected.

#### Acceptance Criteria

1. THE Calendar_API SHALL never show sickness leave to colleagues (only to self, direct manager, and admins)
2. WHEN calendar visibility is set to OWN, THE System SHALL only show the user's own leave
3. WHEN calendar visibility is set to DEPARTMENT, THE System SHALL show department colleagues' non-sickness leave
4. WHEN a manager views the calendar, THE System SHALL show direct reports' leave (including sickness) but restrict company-wide visibility
5. THE Leave_Request_API SHALL validate the requestor can create/approve leave for the target employee

### Requirement 7: Reports Module Security

**User Story:** As an HR administrator, I want reports to only show data the user is authorized to see, so that sensitive information is not exposed.

#### Acceptance Criteria

1. THE Reports_API SHALL validate companyId on all queries
2. THE System SHALL use Prisma's parameterized queries (not raw SQL) to prevent injection attacks
3. WHEN sharing a report, THE System SHALL validate the recipient belongs to the same tenant
4. THE System SHALL validate selected fields against an allowlist of reportable fields

### Requirement 8: News Module Security

**User Story:** As an HR administrator, I want news posts to be visible only to the intended audience, so that targeted communications reach the right people.

#### Acceptance Criteria

1. THE News_API SHALL validate companyId on all operations
2. WHEN a news post has audience restrictions, THE System SHALL only show it to users matching department/role/location criteria
3. THE System SHALL require ADMIN role to send news emails
4. THE System SHALL validate hasPermission for news edit operations

### Requirement 9: Surveys Module Security

**User Story:** As an HR administrator, I want survey responses to be properly anonymized based on settings, so that employee feedback is protected.

#### Acceptance Criteria

1. THE Surveys_API SHALL validate companyId on all operations
2. WHEN creating a survey, THE System SHALL validate the form template belongs to the same tenant
3. THE System SHALL support anonymization levels: public, department, location, full
4. THE System SHALL validate target audience criteria (departments, job roles, locations) exist in the tenant

### Requirement 10: Input Validation

**User Story:** As a system administrator, I want all user inputs to be validated, so that the system is protected from malformed or malicious data.

#### Acceptance Criteria

1. THE System SHALL use Zod schemas for request body validation on POST/PUT endpoints
2. WHEN validation fails, THE System SHALL return 400 with descriptive error details
3. THE System SHALL sanitize file names before storage (remove special characters)
4. THE System SHALL validate pagination parameters (limit max 100, skip max 10000)

### Requirement 11: Error Handling

**User Story:** As a system administrator, I want errors to be handled securely, so that sensitive information is not leaked in error messages.

#### Acceptance Criteria

1. THE System SHALL NOT expose stack traces in production error responses
2. THE System SHALL return generic error messages for 500 errors
3. THE System SHALL log detailed errors server-side for debugging
4. WHEN a resource is not found, THE System SHALL return 404 without revealing whether the resource exists in another tenant
