# Requirements Document

## Introduction

This feature enables tenant-level feature toggles that allow system administrators to enable or disable specific modules for each tenant (company). This supports a phased production rollout where incomplete or premium features can be hidden from tenants until ready, and allows different pricing tiers to offer different feature sets.

The system will be managed from the tenant-admin portal, with toggles affecting navigation visibility, API access, and settings availability.

## Glossary

- **Tenant**: A company entity in the system, represented by the `Company` model
- **Feature_Toggle**: A boolean setting that enables or disables a specific module for a tenant
- **Feature_Key**: A unique identifier for each toggleable feature (e.g., `ai_assistant`, `performance_management`)
- **Tenant_Admin**: The super-admin portal for managing tenants at `/tenant-admin`
- **Module**: A distinct functional area of the application (e.g., Performance, Surveys, Org Chart)
- **Navigation_Filter**: Logic that hides sidebar items and settings based on enabled features
- **API_Guard**: Middleware that blocks API access to disabled features

## Requirements

### Requirement 1: Feature Toggle Data Model

**User Story:** As a system administrator, I want feature toggles stored per-tenant in the database, so that each tenant can have different features enabled.

#### Acceptance Criteria

1. THE Database SHALL store a `TenantFeatureToggle` record for each feature-tenant combination
2. WHEN a new tenant is created, THE System SHALL create default toggle records with all features enabled
3. THE Feature_Toggle record SHALL include: companyId, featureKey, isEnabled, createdAt, updatedAt
4. THE System SHALL support the following feature keys:
   - `ai_assistant` - AI Assistant functionality
   - `news` - News/Communications module
   - `bulk_actions` - Bulk Actions functionality
   - `performance_management` - Performance module
   - `journeys` - Journeys (non-onboarding workflows)
   - `onboarding` - Onboarding templates and workflows
   - `automation_rules` - Workflow automation engine
   - `event_rules` - Event-triggered notifications
   - `org_chart` - Organization chart visualization
   - `surveys` - Survey creation and distribution
   - `forms` - Custom forms builder
   - `timesheets` - Timesheet management
   - `rota_shifts` - Rota/Shifts and Reconciliation (bundled together)
   - `multi_stage_approvals` - Multi-stage approval workflows
   - `analytics` - Analytics dashboard and insights

### Requirement 2: Tenant Configuration UI with Feature Toggles

**User Story:** As a system administrator, I want feature toggles integrated into each tenant's detail/edit page, so that I can manage all tenant settings in one place.

#### Acceptance Criteria

1. WHEN viewing a tenant's detail page in tenant-admin, THE System SHALL display a "Functionality" section
2. THE Functionality section SHALL display all feature toggles grouped into logical categories:
   - Core HR Tools: Performance, Surveys, Forms, Org Chart, Analytics
   - Automation: Automation Rules, Event Rules, Multi-stage Approvals
   - Employee Experience: News, Journeys, Onboarding
   - Operations: Timesheets, Rota & Shifts (includes Reconciliation), Bulk Actions
   - AI: AI Assistant
3. WHEN a toggle is changed, THE System SHALL immediately persist the change to the database
4. THE System SHALL display a confirmation toast when a toggle is successfully changed
5. IF a toggle change fails, THEN THE System SHALL display an error message and revert the UI state
6. WHEN creating a new tenant, THE System SHALL display the Functionality section with checkboxes to select initial features
7. THE Create Tenant form SHALL allow selecting which features to enable out of the box
8. THE System SHALL provide a "Select All" and "Select None" option for convenience during tenant creation

### Requirement 3: Navigation Filtering

**User Story:** As a tenant user, I want to only see navigation items for features that are enabled for my tenant, so that the interface is not cluttered with unavailable options.

#### Acceptance Criteria

1. WHEN rendering the admin sidebar, THE System SHALL filter out navigation items for disabled features
2. WHEN rendering the manager sidebar, THE System SHALL filter out navigation items for disabled features
3. WHEN rendering the employee sidebar, THE System SHALL filter out navigation items for disabled features
4. WHEN rendering the settings page, THE System SHALL hide setting cards for disabled features
5. THE Navigation_Filter SHALL map feature keys to navigation paths:
   - `ai_assistant` → AI-related UI elements
   - `news` → `/news`
   - `bulk_actions` → `/bulk-actions`
   - `performance_management` → `/performance`
   - `journeys` → `/settings/journeys` (non-onboarding items)
   - `onboarding` → Onboarding-related settings
   - `automation_rules` → `/settings/automation-rules`, App Library
   - `event_rules` → `/settings/event-rules`
   - `org_chart` → `/org-chart`
   - `surveys` → `/surveys`, `/settings/surveys`
   - `forms` → `/settings/forms`
   - `timesheets` → `/admin/timesheets/hub`
   - `rota_shifts` → `/rota`, `/admin/reconciliation`
   - `multi_stage_approvals` → `/settings/multi-stage-approvals`
   - `analytics` → `/analytics`

### Requirement 4: API Access Control

**User Story:** As a system administrator, I want API endpoints to reject requests for disabled features, so that users cannot bypass the UI to access disabled functionality.

#### Acceptance Criteria

1. WHEN an API request is made for a disabled feature, THE System SHALL return a 403 Forbidden response
2. THE API response SHALL include a message indicating the feature is not enabled for this tenant
3. THE API_Guard SHALL check feature status before processing requests for:
   - `/api/ai/*` routes when `ai_assistant` is disabled
   - `/api/news/*` routes when `news` is disabled
   - `/api/bulk-actions/*` routes when `bulk_actions` is disabled
   - `/api/performance/*` routes when `performance_management` is disabled
   - `/api/journeys/*` routes when `journeys` is disabled
   - `/api/onboarding/*` routes when `onboarding` is disabled
   - `/api/automation-rules/*` routes when `automation_rules` is disabled
   - `/api/event-rules/*` routes when `event_rules` is disabled
   - `/api/org-chart/*` routes when `org_chart` is disabled
   - `/api/surveys/*` routes when `surveys` is disabled
   - `/api/forms/*` routes when `forms` is disabled
   - `/api/timesheets/*` routes when `timesheets` is disabled
   - `/api/rota-groups/*`, `/api/shifts/*`, `/api/reconciliation/*` when `rota_shifts` is disabled
   - `/api/approval-workflows/*` routes when `multi_stage_approvals` is disabled
   - `/api/analytics/*` routes when `analytics` is disabled
4. THE System SHALL NOT block core API routes (employees, calendar, documents, reports, leave)

### Requirement 5: Feature Toggle Caching

**User Story:** As a system user, I want feature toggle checks to be fast, so that navigation and API responses are not slowed down.

#### Acceptance Criteria

1. THE System SHALL cache feature toggle states per tenant in memory
2. WHEN a toggle is changed via tenant-admin, THE System SHALL invalidate the cache for that tenant
3. THE Cache SHALL have a maximum TTL of 5 minutes to handle edge cases
4. WHEN the cache is empty for a tenant, THE System SHALL fetch toggles from the database

### Requirement 6: Settings Page Reorganization

**User Story:** As a tenant administrator, I want onboarding settings moved to the Forms & Data Collection section, so that related functionality is grouped together.

#### Acceptance Criteria

1. THE Settings page SHALL display Onboarding under the "Forms & Data Collection" accordion section
2. THE Onboarding settings link SHALL remain at `/settings/onboarding`
3. WHEN `onboarding` feature is disabled, THE System SHALL hide the Onboarding card from Forms & Data Collection
4. THE Journeys settings SHALL remain in the Workflows section and only show non-onboarding journey types
5. WHEN `journeys` feature is disabled, THE System SHALL hide the Journeys card from Workflows section
6. THE Onboarding toggle SHALL be independent from the Journeys toggle

### Requirement 7: Feature Toggle API

**User Story:** As a system administrator, I want API endpoints to manage feature toggles, so that the tenant-admin UI can persist changes.

#### Acceptance Criteria

1. THE System SHALL provide `GET /api/tenant-admin/feature-toggles` to list all toggles for all tenants
2. THE System SHALL provide `GET /api/tenant-admin/feature-toggles/[companyId]` to get toggles for a specific tenant
3. THE System SHALL provide `PATCH /api/tenant-admin/feature-toggles/[companyId]` to update toggles for a tenant
4. WHEN updating toggles, THE System SHALL accept a partial object with only the changed feature keys
5. THE API endpoints SHALL require tenant-admin authentication
6. THE System SHALL log all toggle changes to the audit log

### Requirement 8: Graceful Degradation

**User Story:** As a tenant user, I want the system to handle disabled features gracefully, so that I don't encounter errors when features are turned off.

#### Acceptance Criteria

1. WHEN a user navigates directly to a disabled feature's URL, THE System SHALL redirect to the dashboard
2. THE System SHALL display a toast message: "This feature is not available for your organization"
3. WHEN a feature is disabled that has existing data, THE System SHALL preserve the data but hide access
4. WHEN a feature is re-enabled, THE System SHALL restore access to previously created data
5. THE Dashboard widgets SHALL hide sections related to disabled features
