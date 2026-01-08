# Implementation Plan: Tenant Feature Toggles

## Overview

This implementation plan creates a tenant-level feature toggle system integrated into the tenant-admin portal. The approach is incremental: first the data layer, then the service, then UI, and finally the guards.

## Tasks

- [x] 1. Database Schema and Types
  - [x] 1.1 Add TenantFeatureToggle model to Prisma schema
    - Add model with id, companyId, featureKey, isEnabled, createdAt, updatedAt
    - Add relation to Company model
    - Add unique constraint on [companyId, featureKey]
    - Add index on companyId
    - _Requirements: 1.1, 1.3_

  - [x] 1.2 Create feature toggle types and constants
    - Create `lib/feature-toggles/types.ts` with FEATURE_KEYS enum
    - Define FeatureKey type, FeatureToggleState interface
    - Define FEATURE_CATEGORIES configuration
    - Define FEATURE_TO_PATHS mapping
    - _Requirements: 1.4, 3.5_

  - [x] 1.3 Run Prisma migration
    - Generate and apply migration for TenantFeatureToggle table
    - _Requirements: 1.1_

- [ ] 2. Feature Toggle Service
  - [ ] 2.1 Implement FeatureToggleService class
    - Create `lib/feature-toggles/service.ts`
    - Implement isFeatureEnabled() with caching
    - Implement getEnabledFeatures() with caching
    - Implement setFeatureEnabled() with cache invalidation
    - Implement bulkSetFeatures() for batch updates
    - Implement initializeDefaultToggles() for new tenants
    - Use existing cache infrastructure from lib/cache.ts
    - _Requirements: 2.3, 5.1, 5.2, 5.3, 5.4_

  - [ ] 2.2 Write property test for toggle persistence round-trip
    - **Property 1: Toggle Persistence Round-Trip**
    - **Validates: Requirements 1.1, 2.3**

  - [ ] 2.3 Write property test for cache invalidation
    - **Property 7: Cache Invalidation on Update**
    - **Validates: Requirements 5.2**

- [ ] 3. Tenant Admin API Endpoints
  - [ ] 3.1 Create GET /api/tenant-admin/feature-toggles endpoint
    - Return all toggles for all tenants (for dashboard view)
    - Require tenant-admin authentication
    - _Requirements: 7.1, 7.5_

  - [ ] 3.2 Create GET /api/tenant-admin/feature-toggles/[companyId] endpoint
    - Return toggles for specific tenant
    - Require tenant-admin authentication
    - _Requirements: 7.2, 7.5_

  - [ ] 3.3 Create PATCH /api/tenant-admin/feature-toggles/[companyId] endpoint
    - Accept partial update object
    - Update only specified feature keys
    - Invalidate cache after update
    - Log changes to audit log
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [ ] 3.4 Write property test for partial update preservation
    - **Property 8: Partial Update Preservation**
    - **Validates: Requirements 7.4**

  - [ ] 3.5 Write property test for authentication enforcement
    - **Property 9: Authentication Enforcement**
    - **Validates: Requirements 7.5**

- [ ] 4. Checkpoint - Core Service Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Tenant Admin UI Integration
  - [ ] 5.1 Create FunctionalitySection component
    - Create `app/tenant-admin/components/FunctionalitySection.tsx`
    - Display feature toggles grouped by category
    - Implement toggle switches with immediate persistence
    - Show confirmation toast on success
    - Revert UI state on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 5.2 Integrate FunctionalitySection into tenant detail page
    - Add to existing tenant detail/edit page
    - Fetch current toggle states on load
    - _Requirements: 2.1_

  - [ ] 5.3 Add feature selection to tenant creation form
    - Add FunctionalitySection to create tenant dialog
    - Add "Select All" and "Select None" buttons
    - Pass selected features to tenant creation API
    - _Requirements: 2.6, 2.7, 2.8_

  - [ ] 5.4 Update tenant creation API to accept initial features
    - Modify POST /api/tenant-admin/tenants to accept enabledFeatures array
    - Call initializeDefaultToggles with selected features
    - _Requirements: 1.2, 2.7_

- [ ] 6. Navigation Filtering
  - [ ] 6.1 Create useFeatureToggles hook
    - Create `app/hooks/useFeatureToggles.ts`
    - Fetch enabled features for current tenant
    - Provide isFeatureEnabled() helper
    - Provide filterNavItems() helper
    - Cache results in SWR
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 6.2 Update AdminSidebar to filter navigation items
    - Import useFeatureToggles hook
    - Filter coreLinks, hrToolsLinks, bulkActionLinks based on enabled features
    - _Requirements: 3.1_

  - [ ] 6.3 Update ManagerSidebar to filter navigation items
    - Import useFeatureToggles hook
    - Filter navigation items based on enabled features
    - _Requirements: 3.2_

  - [ ] 6.4 Update EmployeeSidebar to filter navigation items
    - Import useFeatureToggles hook
    - Filter navigation items based on enabled features
    - _Requirements: 3.3_

  - [ ] 6.5 Write property test for navigation filtering consistency
    - **Property 3: Navigation Filtering Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 7. Settings Page Updates
  - [ ] 7.1 Move Onboarding to Forms & Data Collection section
    - Update settings page to include Onboarding in formSettings array
    - Remove from workflowSettings if present
    - _Requirements: 6.1, 6.2_

  - [ ] 7.2 Filter settings cards based on feature toggles
    - Import useFeatureToggles hook
    - Filter holidaySettings, formSettings, workflowSettings, documentSettings
    - Hide cards for disabled features
    - _Requirements: 3.4, 6.3, 6.4, 6.5_

  - [ ] 7.3 Write property test for settings card filtering
    - **Property 4: Settings Card Filtering**
    - **Validates: Requirements 3.4, 6.3, 6.5**

- [ ] 8. Checkpoint - UI Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. API Guards Implementation
  - [ ] 9.1 Create withFeatureGuard higher-order function
    - Create `lib/feature-toggles/api-guard.ts`
    - Implement HOF that wraps route handlers
    - Return 403 with feature disabled message
    - _Requirements: 4.1, 4.2_

  - [ ] 9.2 Apply guards to AI Assistant routes
    - Wrap /api/ai/* route handlers with withFeatureGuard('ai_assistant')
    - _Requirements: 4.3_

  - [ ] 9.3 Apply guards to News routes
    - Wrap /api/news/* route handlers with withFeatureGuard('news')
    - _Requirements: 4.3_

  - [ ] 9.4 Apply guards to Performance routes
    - Wrap /api/performance/* route handlers with withFeatureGuard('performance_management')
    - _Requirements: 4.3_

  - [ ] 9.5 Apply guards to remaining feature routes
    - Apply guards to: bulk-actions, journeys, onboarding, automation-rules, event-rules, org-chart, surveys, forms, timesheets, rota-groups, shifts, reconciliation, approval-workflows, analytics
    - _Requirements: 4.3_

  - [ ] 9.6 Write property test for API guard enforcement
    - **Property 5: API Guard Enforcement**
    - **Validates: Requirements 4.1, 4.3**

  - [ ] 9.7 Write property test for core routes accessibility
    - **Property 6: Core Routes Always Accessible**
    - **Validates: Requirements 4.4**

- [ ] 10. Graceful Degradation
  - [ ] 10.1 Create FeatureGuardedPage wrapper component
    - Create `app/components/FeatureGuardedPage.tsx`
    - Check if feature is enabled on mount
    - Redirect to dashboard if disabled
    - Show toast message
    - _Requirements: 8.1, 8.2_

  - [ ] 10.2 Apply FeatureGuardedPage to feature pages
    - Wrap Performance, Surveys, News, Org Chart, Analytics, Bulk Actions pages
    - Wrap Timesheets, Rota, Reconciliation pages
    - _Requirements: 8.1_

  - [ ] 10.3 Update dashboard to hide disabled feature widgets
    - Filter dashboard widgets based on enabled features
    - _Requirements: 8.5_

  - [ ] 10.4 Write property test for direct URL redirect
    - **Property 13: Direct URL Redirect**
    - **Validates: Requirements 8.1**

- [ ] 11. Audit Logging
  - [ ] 11.1 Add audit log entries for toggle changes
    - Log companyId, featureKey, oldValue, newValue, timestamp, userId
    - Use existing GlobalAuditLog model
    - _Requirements: 7.6_

  - [ ] 11.2 Write property test for audit log completeness
    - **Property 10: Audit Log Completeness**
    - **Validates: Requirements 7.6**

- [ ] 12. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no regressions in existing functionality
  - Test with multiple tenants to confirm isolation

- [ ] 13. Production Safeguards
  - [ ] 13.1 Add integration tests for multi-tenant isolation
    - Test that Tenant A cannot see Tenant B's feature toggles
    - Test that cache keys are properly scoped by companyId
    - Test that API guards respect tenant boundaries
    - _Requirements: 1.1, 4.3, 5.1_

  - [ ] 13.2 Add rollback migration script
    - Create script to disable feature toggles table if issues arise
    - Document rollback procedure
    - _Requirements: 1.1_

  - [ ] 13.3 Write property test for toggle independence
    - **Property 12: Toggle Independence**
    - **Validates: Requirements 6.6**

  - [ ] 13.4 Write property test for data preservation on disable/re-enable
    - **Property 11: Data Preservation on Disable/Re-enable**
    - **Validates: Requirements 8.3, 8.4**

  - [ ] 13.5 Add monitoring and alerting hooks
    - Log feature toggle changes to application logs
    - Add metrics for toggle check latency
    - Add alert for cache miss rate exceeding threshold
    - _Requirements: 5.1, 5.2_

- [ ] 14. Documentation and Handoff
  - [ ] 14.1 Create tenant admin user guide
    - Document how to enable/disable features
    - Document feature dependencies (if any)
    - Document expected behavior when features are disabled
    - _Requirements: 2.1, 2.2_

  - [ ] 14.2 Update API documentation
    - Document new tenant-admin endpoints
    - Document 403 response format for disabled features
    - _Requirements: 4.1, 4.2, 7.1, 7.2, 7.3_

- [ ] 15. Final Production Verification
  - Run full test suite
  - Verify all property tests pass with 100+ iterations
  - Manual testing with at least 2 different tenants
  - Verify audit logs are being created correctly
  - Confirm no performance degradation in navigation rendering

## Notes

- All tasks are required for production readiness
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- API guards should be applied incrementally to avoid breaking existing functionality
- Multi-tenant isolation is verified at every layer (DB, cache, API, UI)
