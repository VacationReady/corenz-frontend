# Implementation Plan: Production Readiness Audit

## Overview

This implementation plan provides actionable audit tasks to verify PeopleCore HRIS is production-ready. Tasks are organized by security domain and include both verification steps and remediation actions.

## Tasks

- [x] 1. Run Existing Security Test Suite
  - Execute all existing security tests to establish baseline
  - Command: `npm test -- --run`
  - Document any failing tests
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 2. Audit Authentication Layer
  - [x] 2.1 Verify all API routes check authentication
    - Review routes in `app/api/` for `auth()` or `getMobileSession()` calls
    - Ensure 401 is returned for unauthenticated requests
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Verify session includes companyId
    - Check that all authenticated routes validate `session.user.companyId`
    - _Requirements: 2.1_

- [x] 3. Audit Tenant Isolation
  - [x] 3.1 Verify Employees API tenant isolation
    - Review `app/api/employees/route.ts` for companyId filtering
    - Review `app/api/employees/[id]/` routes
    - _Requirements: 2.1, 4.1_
  - [x] 3.2 Verify Documents API tenant isolation
    - Review `app/api/documents/` routes for companyId filtering
    - _Requirements: 2.1, 5.1_
  - [x] 3.3 Verify Calendar/Leave API tenant isolation
    - Review `app/api/calendar-events/route.ts`
    - Review `app/api/leave-request/` routes
    - _Requirements: 2.1, 6.5_
  - [x] 3.4 Verify Reports API tenant isolation
    - Review `app/api/reports/` routes for companyId filtering
    - _Requirements: 2.1, 7.1_
  - [x] 3.5 Verify News API tenant isolation
    - Review `app/api/news/route.ts` for companyId filtering
    - _Requirements: 2.1, 8.1_
  - [x] 3.6 Verify Surveys API tenant isolation
    - Review `app/api/surveys/route.ts` for companyId filtering
    - _Requirements: 2.1, 9.1_

- [-] 4. Audit Authorization Layer
  - [x] 4.1 Verify RBAC implementation
    - Review `app/lib/permissions.ts` for role-based access
    - Verify ADMIN/SUPER_ADMIN bypass logic
    - _Requirements: 3.1, 3.2, 3.3_
  - [-] 4.2 Verify permission profile resolution
    - Review `resolvePermissions()` function
    - Verify profile takes precedence over role defaults
    - _Requirements: 3.4_
  - [ ] 4.3 Verify manager hierarchy access
    - Review `canAccessEmployee()` function
    - Verify managers can only access direct/indirect reports
    - _Requirements: 3.2_

- [x] 5. Audit Document Security
  - [x] 5.1 Verify file upload validation
    - Review `app/api/documents/upload/route.ts`
    - Confirm allowlist: PDF, PNG, JPEG, DOC, DOCX
    - Confirm 10MB size limit
    - _Requirements: 5.2, 5.3_
  - [x] 5.2 Verify document visibility enforcement
    - Review `app/api/documents/list/route.ts`
    - Verify canViewAdmin/Manager/Employee flags are checked
    - Verify department/jobRole restrictions
    - _Requirements: 5.5, 5.6_
  - [x] 5.3 Verify signed URL generation
    - Confirm 5-minute expiry on signed URLs
    - _Requirements: 5.4_

- [x] 6. Audit Calendar/Leave Security
  - [x] 6.1 Verify sickness leave privacy
    - Review `app/api/calendar-events/route.ts`
    - Confirm sickness is hidden from colleagues
    - Confirm sickness is visible to direct managers
    - _Requirements: 6.1_
  - [x] 6.2 Verify calendar visibility scopes
    - Verify OWN scope shows only user's leave
    - Verify DEPARTMENT scope shows department colleagues
    - Verify COMPANY scope is restricted for managers
    - _Requirements: 6.2, 6.3, 6.4_
  - [x] 6.3 Verify leave request authorization
    - Review `app/lib/authz.ts`
    - Verify `canCreateLeaveRequest()` and `canApproveLeaveRequest()`
    - _Requirements: 6.5_

- [x] 7. Audit Reports Security
  - [x] 7.1 Verify no raw SQL queries
    - Search for `$queryRaw` or `$executeRaw` in reports code
    - Confirm all queries use Prisma ORM
    - _Requirements: 7.2_
  - [x] 7.2 Verify report sharing validation
    - Review `app/api/reports/share/route.ts`
    - Confirm recipient tenant validation
    - _Requirements: 7.3_

- [x] 8. Audit News Security
  - [x] 8.1 Verify audience filtering
    - Review `app/api/news/route.ts` GET handler
    - Confirm audience restrictions are enforced
    - _Requirements: 8.2_
  - [x] 8.2 Verify admin-only email sending
    - Confirm sendEmail requires ADMIN role
    - _Requirements: 8.3_

- [x] 9. Audit Surveys Security
  - [x] 9.1 Verify form template tenant validation
    - Review `app/api/surveys/route.ts` POST handler
    - Confirm form belongs to same tenant
    - _Requirements: 9.2_

- [x] 10. Audit Input Validation
  - [x] 10.1 Verify Zod schema usage
    - Review POST/PUT endpoints for Zod validation
    - Document any endpoints missing validation
    - _Requirements: 10.1, 10.2_
  - [x] 10.2 Verify pagination limits
    - Confirm limit max 100, skip max 10000
    - _Requirements: 10.4_
  - [x] 10.3 Verify file name sanitization
    - Review document upload for name sanitization
    - _Requirements: 10.3_

- [x] 11. Audit Error Handling
  - [x] 11.1 Verify no stack traces in responses
    - Review error handling patterns
    - Confirm generic messages for 500 errors
    - _Requirements: 11.1, 11.2_
  - [x] 11.2 Verify 404 for cross-tenant access
    - Confirm 404 (not 403) is returned
    - _Requirements: 2.2, 11.4_

- [x] 12. Run Dependency Audit
  - Execute `npm audit` to check for vulnerabilities
  - Document any critical/high severity issues
  - Apply fixes with `npm audit fix` where safe
  - _Requirements: Security best practices_

- [ ] 13. Checkpoint - Review Audit Findings
  - Compile list of any security gaps found
  - Prioritize remediation tasks
  - Ensure all tests pass, ask the user if questions arise

- [x] 14. Implement Rate Limiting
  - [x] 14.1 Add rate limiting middleware
    - Implement rate limiting for email endpoints
    - Target: 10 emails/minute per user
    - _Requirements: Security best practices_

- [x] 15. Final Security Verification
  - [x] 15.1 Re-run full test suite
    - Ensure all tests pass after any fixes
    - _Requirements: All_
  - [x] 15.2 Document audit results
    - Create summary of findings
    - List any accepted risks
    - _Requirements: All_

- [ ] 16. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise
  - Confirm system is production-ready

## Notes

- Tasks are ordered by security domain for systematic coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All tasks are required - zero regressions is the goal
- The audit focuses on the 7 core modules: Employees, Dashboards, Reports, Surveys, News, Leave/Calendars, Documents
- Any changes made during the audit must not break existing functionality
- Run tests after each significant change to catch regressions early
