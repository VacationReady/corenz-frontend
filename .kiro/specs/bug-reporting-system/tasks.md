# Implementation Plan: Bug Reporting System

## Overview

This implementation plan breaks down the Bug Reporting System into incremental coding tasks. Each task builds on previous work, starting with the data layer and progressing through API endpoints, frontend components, and optional enhancements. The plan follows an MVP-first approach, with optional features (comments, email notifications) marked for later implementation.

## Tasks

- [x] 1. Extend Feature Toggle System
  - Add `BUG_REPORTING` key to `lib/feature-toggles/types.ts`
  - Add to `FEATURE_CATEGORIES` under "Beta Features" category
  - Add paths to `FEATURE_TO_PATHS` mapping
  - Default to disabled for new tenants
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. Create Database Schema
  - [x] 2.1 Add Prisma models for BugReport, BugAttachment, BugComment
    - Add BugSeverity and BugStatus enums
    - Add BugReport model with all fields and indexes
    - Add BugAttachment model with cascade delete
    - Add BugComment model for optional enhancement
    - Add relations to User and Company models
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Run database migration
    - Generate and apply Prisma migration
    - Verify indexes are created
    - _Requirements: 3.3_

- [x] 3. Create TypeScript Types
  - Create `app/types/bugs.ts` with BugReport, BugAttachment, BugComment interfaces
  - Create BugStats interface for admin dashboard
  - Create API request/response types
  - _Requirements: 3.1, 3.2_

- [x] 4. Implement Bug Service Layer
  - [x] 4.1 Create bug service with CRUD operations
    - Create `lib/bugs/service.ts`
    - Implement createBug with tenant isolation
    - Implement getBugById with tenant check
    - Implement listBugsForTenant with filtering/sorting/pagination
    - Implement listAllBugs for tenant admin
    - Implement updateBugStatus with audit logging
    - _Requirements: 4.8, 5.3, 6.2, 8.5, 9.1, 9.4_

  - [ ]* 4.2 Write property test for tenant isolation
    - **Property 1: Tenant Isolation for User Bug Queries**
    - **Validates: Requirements 5.3, 6.2, 6.5, 9.1, 9.2**

  - [x] 4.3 Implement input validation and sanitization
    - Create validation functions for title, description, severity
    - Implement XSS sanitization using DOMPurify
    - _Requirements: 4.7, 9.5_

  - [x] 4.4 Write property test for input sanitization

    - **Property 5: Input Sanitization**
    - **Validates: Requirements 4.7, 9.5**

- [x] 5. Implement User Bug API Endpoints
  - [x] 5.1 Create POST /api/bugs endpoint
    - Implement authentication check
    - Implement feature toggle check
    - Validate request body
    - Create bug with auto-captured metadata
    - Return 201 with created bug
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

  - [ ]* 5.2 Write property test for bug creation validation
    - **Property 6: Bug Creation Validation**
    - **Property 7: Valid Bug Creation**
    - **Validates: Requirements 2.4, 2.5, 4.3, 4.4, 4.8**

  - [x] 5.3 Create GET /api/bugs endpoint
    - Implement tenant-scoped query
    - Support status, severity, page, limit, sortBy, sortOrder params
    - Exclude adminNotes from response
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ]* 5.4 Write property test for filtering and sorting
    - **Property 13: Bug Sorting Correctness**
    - **Property 14: Bug Filtering Correctness**
    - **Property 15: Pagination Correctness**
    - **Validates: Requirements 5.4, 5.5, 5.7, 7.4, 7.5**

  - [x] 5.5 Create GET /api/bugs/[id] endpoint
    - Verify bug belongs to user's tenant
    - Exclude adminNotes from response
    - _Requirements: 6.4, 6.5, 6.6_

  - [x] 5.6 Write property test for admin notes exclusion

    - **Property 4: Admin Notes Exclusion for Non-Admins**
    - **Validates: Requirements 5.6, 6.6**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Tenant Admin Bug API Endpoints
  - [x] 7.1 Create GET /api/tenant-admin/bugs endpoint
    - Verify canManageTenants permission
    - Support all filter params including companyId, dateFrom, dateTo
    - Include bug statistics in response
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 7.2 Write property test for tenant admin permission
    - **Property 3: Tenant Admin Permission Enforcement**
    - **Validates: Requirements 7.2, 8.2, 8.7, 9.3**

  - [x] 7.3 Create PATCH /api/tenant-admin/bugs/[id] endpoint
    - Verify canManageTenants permission
    - Only allow updating status, adminNotes
    - Auto-set resolvedAt when status changes to RESOLVED/CLOSED
    - Create audit log entry
    - _Requirements: 8.4, 8.5, 8.6, 9.4_

  - [x] 7.4 Write property test for status change audit logging

    - **Property 11: Status Change Audit Logging**
    - **Property 12: Resolved Date Auto-Population**
    - **Validates: Requirements 8.6, 9.4**

- [ ] 8. Implement Attachment Handling
  - [ ] 8.1 Create attachment service
    - Create `lib/bugs/attachments.ts`
    - Implement MIME type validation
    - Implement file size validation
    - Implement attachment count validation
    - Integrate with cloud storage (existing storage lib)
    - _Requirements: 9.6, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 8.2 Write property tests for attachment validation
    - **Property 8: Attachment MIME Type Validation**
    - **Property 9: Attachment Size Validation**
    - **Property 10: Attachment Count Limit**
    - **Validates: Requirements 9.6, 10.1, 10.2, 10.3**

  - [ ] 8.3 Create POST /api/bugs/[id]/attachments endpoint
    - Validate file before upload
    - Store in cloud storage
    - Create BugAttachment record
    - _Requirements: 10.4_

  - [ ] 8.4 Create GET /api/bugs/attachments/[id]/download endpoint
    - Generate time-limited signed URL
    - Verify user has access to parent bug
    - _Requirements: 10.5_

  - [ ] 8.5 Implement cascade deletion for attachments
    - Delete storage files when bug is deleted
    - _Requirements: 10.6_

  - [ ]* 8.6 Write property test for cascade deletion
    - **Property 18: Cascade Attachment Deletion**
    - **Validates: Requirements 10.6**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Bug Submission Modal
  - [ ] 10.1 Create BugSubmissionModal component
    - Create `app/components/bugs/BugSubmissionModal.tsx`
    - Implement form with title, description, stepsToReproduce, severity fields
    - Add file upload for attachments
    - Auto-capture pageUrl and userAgent
    - Implement validation and error display
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 10.2 Create ReportBugButton component
    - Create `app/components/bugs/ReportBugButton.tsx`
    - Use useFeatureToggles hook to check BUG_REPORTING
    - Render button only when feature enabled
    - Style as subtle icon button with Bug icon from lucide-react
    - Add tooltip "Report a Bug" on hover
    - Open modal on click
    - _Requirements: 1.2, 2.1_

  - [ ]* 10.3 Write property test for feature toggle UI
    - **Property 2: Feature Toggle Enforcement**
    - **Validates: Requirements 1.2, 1.3, 4.6**

  - [ ] 10.4 Add ReportBugButton to admin header
    - Add to admin/manager header navigation (not sidebar)
    - Position near other action buttons
    - Only visible to ADMIN and MANAGER roles
    - _Requirements: 2.1_

- [ ] 11. Implement User Bug Dashboard
  - [ ] 11.1 Create BugReportTable component
    - Create `app/components/bugs/BugReportTable.tsx`
    - Display columns: Title, Status, Severity, Date Submitted, Resolved Date, Comments Count
    - Implement sorting controls
    - Implement filter dropdowns for Status and Severity
    - Implement pagination
    - _Requirements: 5.2, 5.4, 5.5, 5.7_

  - [ ] 11.2 Create BugDetailModal component
    - Create `app/components/bugs/BugDetailModal.tsx`
    - Display all bug information except adminNotes
    - Show attachments with download links
    - _Requirements: 5.6_

  - [ ] 11.3 Create User Bug Dashboard page
    - Create `app/(withSidebar)/bugs/page.tsx`
    - Wrap with FeatureGuardedPage for BUG_REPORTING
    - Integrate BugReportTable and BugDetailModal
    - _Requirements: 5.1_

  - [ ] 11.4 Add navigation link for Bug Reports
    - Add to sidebar navigation
    - Conditionally show based on feature toggle
    - _Requirements: 5.1_

- [ ] 12. Implement Tenant Admin Bug Dashboard
  - [ ] 12.1 Create AdminBugStats component
    - Create `app/tenant-admin/components/AdminBugStats.tsx`
    - Modern glass-morphism stat cards matching existing tenant admin design
    - Cards: Total Bugs (purple), Open (red), In Progress (amber), Resolved (green)
    - Use lucide-react icons (Bug, AlertCircle, Clock, CheckCircle)
    - _Requirements: 7.7_

  - [ ] 12.2 Create AdminBugTable component
    - Create `app/tenant-admin/components/AdminBugTable.tsx`
    - Modern table with glass styling and hover effects
    - Columns: Bug ID, Title, Tenant Name, Submitted By, Status, Severity, Date Submitted, Date Resolved
    - Status badges with color coding (OPEN=red, IN_PROGRESS=amber, RESOLVED=green, CLOSED=gray, WONT_FIX=slate)
    - Severity badges (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=blue)
    - Click row to open detail panel
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ] 12.3 Create AdminBugFilterBar component
    - Create `app/tenant-admin/components/AdminBugFilterBar.tsx`
    - Dropdowns: Tenant (all tenants), Status, Severity
    - Date range picker for Date Submitted
    - Clear filters button
    - _Requirements: 7.4_

  - [ ] 12.4 Create AdminBugDetailPanel component
    - Create `app/tenant-admin/components/AdminBugDetailPanel.tsx`
    - Slide-out panel from right side
    - Display all bug information including adminNotes
    - Editable status dropdown
    - Editable admin notes textarea
    - Attachment previews with download links
    - Save/Cancel buttons
    - Modern styling with glass effects
    - _Requirements: 7.6, 8.4, 8.5_

  - [ ] 12.5 Create Tenant Admin Bug Dashboard page
    - Create `app/tenant-admin/bugs/page.tsx`
    - Verify canManageTenants permission
    - Layout: Header → Stats → Filters → Table → Detail Panel
    - Match existing tenant admin portal design (gradient background, glass cards)
    - Integrate all admin components
    - _Requirements: 7.1, 7.2_

  - [ ] 12.6 Add navigation link in tenant admin portal
    - Add "Bug Reports" link to tenant admin sidebar/navigation
    - Use Bug icon from lucide-react
    - _Requirements: 7.1_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement Bug Comments (Optional Enhancement)
  - [ ]* 14.1 Create comment service
    - Create `lib/bugs/comments.ts`
    - Implement addComment with tenant check
    - Implement listComments with admin-only filtering
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 14.2 Write property tests for comments
    - **Property 16: Comment Tenant Isolation**
    - **Property 17: Admin-Only Comment Visibility**
    - **Validates: Requirements 11.1, 11.4, 11.5**

  - [ ]* 14.3 Create comment API endpoints
    - POST /api/bugs/[id]/comments
    - GET /api/bugs/[id]/comments
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 14.4 Add comment UI to bug detail views
    - Add comment list and form to BugDetailModal
    - Add admin-only toggle for tenant admins
    - _Requirements: 11.3, 11.5_

- [ ] 15. Implement Email Notifications (Optional Enhancement)
  - [ ]* 15.1 Create notification service
    - Create `lib/bugs/notifications.ts`
    - Implement sendStatusChangeNotification
    - Check user email preferences
    - Use existing Resend infrastructure
    - _Requirements: 12.1, 12.3, 12.4_

  - [ ]* 15.2 Create email template
    - Create bug status change email template
    - Include bug title, old/new status, link to bug
    - _Requirements: 12.2_

  - [ ]* 15.3 Integrate notifications with status updates
    - Call notification service when status changes
    - _Requirements: 12.1_

- [ ] 16. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows existing codebase patterns for consistency
- Feature toggle integration ensures beta-only visibility
- Tenant isolation is enforced at every layer (service, API, UI)
