# Requirements Document

## Introduction

This document specifies the requirements for a Calendar Settings feature that allows administrators (and optionally managers) to configure high-level visibility rules for calendar events. The feature enables organizations to control what leave information employees and managers can see on the company calendar, while preserving existing sickness privacy rules as a non-configurable security baseline.

## Glossary

- **Calendar_Visibility_Settings**: Company-level configuration that controls what calendar events different user roles can see
- **Employee_Scope**: The visibility scope for employees viewing the calendar (OWN, DEPARTMENT, or COMPANY)
- **Manager_Scope**: The visibility scope for managers viewing the calendar (DIRECT_REPORTS, DEPARTMENT, or COMPANY)
- **Sickness_Privacy_Rules**: The existing, non-configurable rules that restrict sick leave visibility (employees see only their own, managers see direct reports, admins see all)
- **Calendar_Events_API**: The `/api/calendar-events` endpoint that returns leave events for the calendar
- **Settings_API**: The `/api/settings/calendar-visibility` endpoint for reading and updating calendar visibility settings
- **Admin**: A user with the ADMIN role who can configure calendar visibility settings
- **Manager**: A user with the MANAGER role who can view calendar events based on their configured scope
- **Employee**: A user with the EMPLOYEE role who can view calendar events based on their configured scope
- **Direct_Reports**: Employees who report directly or indirectly to a manager in the organizational hierarchy
- **Department**: An organizational unit that groups employees together

## Requirements

### Requirement 1: Calendar Visibility Settings Data Model

**User Story:** As a system administrator, I want calendar visibility settings stored at the company level, so that all users in the organization follow consistent visibility rules.

#### Acceptance Criteria

1. THE Company model SHALL include a `calendarEmployeeScope` field with values OWN, DEPARTMENT, or COMPANY
2. THE Company model SHALL include a `calendarManagerScope` field with values DIRECT_REPORTS, DEPARTMENT, or COMPANY
3. WHEN no settings exist, THE System SHALL default `calendarEmployeeScope` to DEPARTMENT to match current behavior
4. WHEN no settings exist, THE System SHALL default `calendarManagerScope` to DEPARTMENT to match current behavior (department + direct reports)
5. THE System SHALL store these settings in the existing Company model in `prisma/schema.prisma`

### Requirement 2: Calendar Visibility Settings API

**User Story:** As an administrator, I want an API endpoint to read and update calendar visibility settings, so that I can configure visibility rules for my organization.

#### Acceptance Criteria

1. THE Settings_API SHALL expose a GET endpoint at `/api/settings/calendar-visibility`
2. WHEN a GET request is made, THE Settings_API SHALL return the current `calendarEmployeeScope` and `calendarManagerScope` values
3. WHEN settings are absent, THE Settings_API SHALL return default values matching current behavior (DEPARTMENT for both scopes)
4. THE Settings_API SHALL expose a PUT endpoint at `/api/settings/calendar-visibility`
5. WHEN a PUT request is made by an Admin, THE Settings_API SHALL update the visibility settings
6. WHEN a PUT request is made by a non-Admin user, THE Settings_API SHALL return a 403 Forbidden error
7. WHEN a PUT request contains invalid scope values, THE Settings_API SHALL return a 400 Bad Request error with validation details
8. THE Settings_API SHALL validate that scope values are one of the allowed enum values

### Requirement 3: Calendar Events Visibility Logic Integration

**User Story:** As a user, I want the calendar to respect the configured visibility settings, so that I see only the events I'm authorized to view.

#### Acceptance Criteria

1. WHEN an Employee views the calendar with `calendarEmployeeScope` set to OWN, THE Calendar_Events_API SHALL return only the employee's own leave events (excluding sickness from others)
2. WHEN an Employee views the calendar with `calendarEmployeeScope` set to DEPARTMENT, THE Calendar_Events_API SHALL return the employee's own leave plus department colleagues' non-sickness leave
3. WHEN an Employee views the calendar with `calendarEmployeeScope` set to COMPANY, THE Calendar_Events_API SHALL return the employee's own leave plus all company employees' non-sickness leave
4. WHEN a Manager views the calendar with `calendarManagerScope` set to DIRECT_REPORTS, THE Calendar_Events_API SHALL return the manager's own leave plus direct reports' leave (including sickness)
5. WHEN a Manager views the calendar with `calendarManagerScope` set to DEPARTMENT, THE Calendar_Events_API SHALL return the manager's own leave plus direct reports' leave (including sickness) plus department colleagues' non-sickness leave
6. WHEN a Manager views the calendar with `calendarManagerScope` set to COMPANY, THE Calendar_Events_API SHALL return the manager's own leave plus direct reports' leave (including sickness) plus all company employees' non-sickness leave
7. THE Calendar_Events_API SHALL preserve existing Sickness_Privacy_Rules regardless of visibility settings
8. THE Calendar_Events_API SHALL maintain the same response shape (employee, categoryName, etc.) after integrating visibility settings
9. WHEN department or location filters are applied, THE Calendar_Events_API SHALL apply them on top of the base visibility scope

### Requirement 4: Sickness Privacy Preservation

**User Story:** As a system administrator, I want sickness privacy rules to remain enforced regardless of visibility settings, so that employee health information is protected.

#### Acceptance Criteria

1. THE System SHALL enforce that Employees can only see their own sick leave, regardless of `calendarEmployeeScope` setting
2. THE System SHALL enforce that Managers can see sick leave only for their Direct_Reports, regardless of `calendarManagerScope` setting
3. THE System SHALL enforce that Admins can see all sick leave across the company
4. THE System SHALL NOT allow any configuration to expose sick leave beyond these rules
5. THE Calendar_Settings_UI SHALL display a tooltip or notice explaining that sickness visibility is non-configurable

### Requirement 5: Calendar Settings UI Section

**User Story:** As an administrator, I want a settings section in the calendar page, so that I can configure visibility rules through a user-friendly interface.

#### Acceptance Criteria

1. WHEN an Admin views the calendar page, THE Calendar_Settings_UI SHALL display a settings section with visibility controls
2. THE Calendar_Settings_UI SHALL include a control for Employee visibility scope with options: "Own leave only", "Department leave", "Company-wide leave"
3. THE Calendar_Settings_UI SHALL include a control for Manager visibility scope with options: "Direct reports", "Department", "Company-wide"
4. THE Calendar_Settings_UI SHALL display a non-editable notice explaining sickness privacy rules
5. WHEN a non-Admin user views the calendar page, THE Calendar_Settings_UI SHALL either hide the settings section or display it as read-only
6. WHEN settings are changed, THE Calendar_Settings_UI SHALL save changes via the Settings_API
7. WHEN settings are saved successfully, THE Calendar_Settings_UI SHALL display a success notification
8. IF settings fail to save, THEN THE Calendar_Settings_UI SHALL display an error notification
9. THE Calendar_Settings_UI SHALL follow existing UI patterns (Card, Switch, Button, Popover) from the calendar page
10. THE Calendar_Settings_UI SHALL match the modern, beautiful design aesthetic of the existing calendar page

### Requirement 6: Dashboard Widget Compatibility

**User Story:** As a user, I want dashboard widgets to respect the new visibility settings, so that absence information is consistent across the application.

#### Acceptance Criteria

1. WHEN the Admin dashboard calls the Calendar_Events_API, THE System SHALL apply the same visibility rules
2. WHEN the Manager dashboard calls the Calendar_Events_API, THE System SHALL apply the same visibility rules
3. THE Dashboard widgets SHALL continue to function without breaking after visibility settings are implemented
4. THE Dashboard widgets SHALL display correct absence counts based on the user's visibility scope

### Requirement 7: Existing Filter Compatibility

**User Story:** As a user, I want existing calendar filters to continue working with the new visibility settings, so that I can further refine what I see.

#### Acceptance Criteria

1. WHEN department filters are applied on the calendar, THE System SHALL apply them on top of the base visibility scope
2. WHEN location filters are applied on the calendar, THE System SHALL apply them on top of the base visibility scope
3. WHEN category filters are applied on the calendar, THE System SHALL apply them on top of the base visibility scope
4. WHEN search is used on the calendar, THE System SHALL apply it on top of the base visibility scope
5. THE System SHALL NOT allow filters to expand visibility beyond the configured scope
