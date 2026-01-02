# Requirements Document: Onboarding Production Bugs

## Introduction

This document captures 5 critical bugs identified during QA audit of the onboarding system that must be resolved before production rollout. The audit covered AddEmployeeModal, onboarding workflows, document collection, and step completion tracking.

## Glossary

- **Onboarding_System**: The complete employee onboarding workflow including AddEmployeeModal, template assignment, step completion, and document collection
- **Step_Completion_API**: The `/api/onboarding/step/[stepId]/complete` endpoint that marks onboarding steps as done
- **Onboarding_Instance**: A record tracking an employee's progress through an onboarding template
- **Tenant**: A company/organization using the HRIS system with isolated data

## Requirements

### Requirement 1: Onboarding Instance Completion Tracking

**User Story:** As an HR administrator, I want the system to automatically mark onboarding as complete when all steps are finished, so that I can accurately track employee onboarding status and trigger post-onboarding workflows.

#### Acceptance Criteria

1. WHEN all OnboardingStepInstance records for an OnboardingInstance have status "completed", THE Onboarding_System SHALL update the OnboardingInstance status to "completed"
2. WHEN the OnboardingInstance status changes to "completed", THE Onboarding_System SHALL set the completedAt timestamp to the current datetime
3. WHEN an OnboardingInstance is marked completed, THE Onboarding_System SHALL emit an event for downstream workflow triggers
4. IF an OnboardingStepInstance is marked incomplete after completion, THEN THE Onboarding_System SHALL revert the OnboardingInstance status to "in_progress"

**Current Bug:** The step completion endpoint (`/api/onboarding/step/[stepId]/complete`) marks individual steps as complete but never checks if all steps are done to update the parent OnboardingInstance status. The `completedAt` field is never populated.

**Impact:** Cannot determine if employees have finished onboarding; reporting is broken; post-onboarding workflows never trigger.

---

### Requirement 2: Onboarding Initialization Failure Recovery

**User Story:** As an HR administrator, I want onboarding to reliably start when I create a new employee, so that new hires don't fall through the cracks without an onboarding journey.

#### Acceptance Criteria

1. WHEN an employee is created with an onboarding template, THE Onboarding_System SHALL ensure onboarding initialization succeeds before returning success to the user
2. IF onboarding initialization fails, THEN THE Onboarding_System SHALL retry up to 3 times with exponential backoff
3. IF onboarding initialization fails after retries, THEN THE Onboarding_System SHALL notify the administrator and create an action item for manual intervention
4. WHEN onboarding initialization fails, THE Onboarding_System SHALL log the failure with full context for debugging
5. THE Onboarding_System SHALL provide a mechanism to manually trigger onboarding for employees where initialization failed

**Current Bug:** In `app/api/employees/route.ts` (lines 1020-1045), onboarding is triggered via async fetch with only `console.warn` on failure. No retry logic, no user notification, no recovery mechanism.

**Impact:** Employees can be created successfully but silently have no onboarding journey; HR has no visibility into failures.

---

### Requirement 3: Form Data Validation Before Profile Sync

**User Story:** As a system administrator, I want onboarding form data to be validated before syncing to employee profiles, so that data integrity is maintained and malicious/corrupted data cannot be written to employee records.

#### Acceptance Criteria

1. WHEN form data is synced to employee profile, THE Step_Completion_API SHALL validate phone numbers match expected format (NZ: 02X XXX XXXX or +64)
2. WHEN form data is synced to employee profile, THE Step_Completion_API SHALL validate IRD numbers using the official IRD checksum algorithm
3. WHEN form data is synced to employee profile, THE Step_Completion_API SHALL validate bank account numbers match NZ format (XX-XXXX-XXXXXXX-XXX)
4. WHEN form data is synced to employee profile, THE Step_Completion_API SHALL validate email addresses match RFC 5322 format
5. WHEN form data is synced to employee profile, THE Step_Completion_API SHALL sanitize text fields to prevent XSS and SQL injection
6. IF validation fails for any field, THEN THE Step_Completion_API SHALL reject the sync and return specific validation errors
7. WHEN sensitive fields (IRD, bank account) are synced, THE Step_Completion_API SHALL create an audit log entry

**Current Bug:** In `app/api/onboarding/step/[stepId]/complete/route.ts`, the `syncFormDataToProfile` function accepts any data from forms and writes directly to User/Employee records with only basic type coercion. No format validation, no sanitization, no audit logging.

**Impact:** Corrupted or malicious data can be written to employee records; compliance risk for sensitive payroll data; no audit trail for data changes.

---

### Requirement 4: Duplicate Onboarding Prevention Enhancement

**User Story:** As an HR administrator, I want the system to prevent duplicate or overlapping onboarding instances, so that employees don't receive confusing duplicate tasks and data integrity is maintained.

#### Acceptance Criteria

1. WHEN starting onboarding for an employee, THE Onboarding_System SHALL check for existing instances with status "active", "in_progress", OR "paused"
2. IF an existing non-terminal onboarding instance exists, THEN THE Onboarding_System SHALL return a clear error with the existing instance details
3. WHEN an employee has a recently completed onboarding (within 30 days), THE Onboarding_System SHALL require explicit confirmation to start a new one
4. THE Onboarding_System SHALL prevent rapid re-triggering by enforcing a minimum 5-second cooldown between onboarding start attempts for the same employee
5. IF duplicate onboarding is detected during employee creation, THEN THE Onboarding_System SHALL still create the employee but skip onboarding with a warning

**Current Bug:** In `app/api/onboarding/start/route.ts` (lines 60-65), duplicate check only looks for `status: { in: ["active", "in_progress"] }`. Doesn't handle paused instances, recently completed instances, or rapid re-triggering.

**Impact:** Employees could have overlapping onboarding instances; re-onboarding recently completed employees without warning; race conditions on rapid submissions.

---

### Requirement 5: Document Upload Validation and Linking

**User Story:** As an HR administrator, I want uploaded documents during onboarding to be properly validated and linked to the onboarding step, so that compliance documents are traceable and secure.

#### Acceptance Criteria

1. WHEN a document is uploaded during onboarding, THE Step_Completion_API SHALL validate file type against allowed types (PDF, PNG, JPG, DOCX)
2. WHEN a document is uploaded during onboarding, THE Step_Completion_API SHALL validate file size does not exceed 10MB
3. WHEN a document is uploaded during onboarding, THE Step_Completion_API SHALL link the document to the OnboardingStepInstance via a foreign key
4. WHEN a document is uploaded for a step that requires a specific document type (e.g., UPLOAD_DOCUMENT with uploadType), THE Step_Completion_API SHALL validate the document matches the required type
5. IF document validation fails, THEN THE Step_Completion_API SHALL reject the upload with specific error messages
6. WHEN a document is uploaded, THE Step_Completion_API SHALL create an audit log entry with uploader, timestamp, and document metadata

**Current Bug:** In `app/api/onboarding/step/[stepId]/complete/route.ts` (lines 470-485), document upload handling creates a Document record but:
- No file type/size validation
- No link to OnboardingStepInstance (orphaned document)
- No validation against step's required document type
- No audit logging

**Impact:** Malicious files could be uploaded; documents not traceable to onboarding steps; compliance audit trail broken; no way to verify required documents were collected.

---

## Priority Matrix

| Bug | Severity | Impact | Effort | Priority |
|-----|----------|--------|--------|----------|
| #1 Completion Tracking | HIGH | Reporting broken, workflows don't trigger | Medium | P1 |
| #2 Initialization Failure | HIGH | Silent failures, employees without onboarding | Medium | P1 |
| #3 Form Data Validation | CRITICAL | Data integrity, security, compliance | High | P1 |
| #4 Duplicate Prevention | MEDIUM | Data integrity, UX confusion | Low | P2 |
| #5 Document Validation | MEDIUM | Compliance, security | Medium | P2 |

## Notes

- All bugs were identified through code review of the onboarding system
- Bugs #1, #2, and #3 are blockers for production deployment
- Bugs #4 and #5 should be addressed before GA but could ship with documented limitations
