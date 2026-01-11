# Implementation Plan: NZ Annual Leave Compliance Refactor

## Overview

This implementation plan refactors PeopleCore's annual leave entitlement logic to comply with the NZ Holidays Act 2003. The approach is incremental: schema changes first, then backend logic, then UI updates, with property tests validating correctness at each stage.

## Tasks

- [x] 1. Add schema fields for NZ annual leave compliance
  - [x] 1.1 Add new fields to Employee model in prisma/schema.prisma
    - Add `futureAnnualLeaveEntitlement` (Decimal, nullable)
    - Add `annualLeaveEntitlementDate` (DateTime, nullable)
    - Add `leaveInAdvanceUsed` (Decimal, default 0)
    - Add `isCasualEmployee` (Boolean, default false)
    - Add `casualToPermanentDate` (DateTime, nullable)
    - _Requirements: 1.1, 1.2, 1.3, 3.2, 4.1_
  - [x] 1.2 Create and run migration
    - Generate migration with `npx prisma migrate dev`
    - Verify migration is additive only (no column drops)
    - _Requirements: 6.3_
  - [x] 1.3 Regenerate Prisma client
    - Run `npx prisma generate`
    - Verify TypeScript types are updated
    - _Requirements: 6.3_

- [x] 2. Modify employee creation to store future entitlement
  - [x] 2.1 Update app/api/employees/route.ts POST handler
    - Store calculator output in `futureAnnualLeaveEntitlement` instead of creating LeaveEntitlement
    - Calculate and store `annualLeaveEntitlementDate` (startDate + 12 months)
    - Skip entitlement storage for casual employees (`isCasualEmployee = true`)
    - Preserve existing pro-rata calculator integration
    - Add inline comments explaining NZ compliance changes
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.1_
  - [x] 2.2 Write property test for future entitlement storage
    - **Property 1: Future Entitlement Storage**
    - Generate random employee creation data
    - Verify no LeaveEntitlement created for new employees
    - Verify futureAnnualLeaveEntitlement is stored correctly
    - **Validates: Requirements 1.1, 1.5**
  - [x] 2.3 Write property test for anniversary date calculation
    - **Property 2: Anniversary Date Calculation**
    - Generate random start dates
    - Verify annualLeaveEntitlementDate = startDate + 12 months exactly
    - **Validates: Requirements 1.2, 1.3**

- [x] 3. Implement anniversary grant logic
  - [x] 3.1 Create lib/leave/annual-leave-anniversary.ts
    - Implement `processAnniversaryGrant(employeeId, grantDate)` function
    - Calculate final balance: futureEntitlement - leaveInAdvanceUsed
    - Handle edge case: leaveInAdvance > futureEntitlement (set to 0, flag for review)
    - Create LeaveEntitlement record with calculated balance
    - Create audit log entry for grant
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.2 Implement `findEmployeesAtAnniversary(companyId, targetDate)` function
    - Query employees where annualLeaveEntitlementDate <= targetDate
    - Exclude employees who already have LeaveEntitlement for Annual Leave
    - Exclude casual employees
    - _Requirements: 2.5, 7.1_
  - [x] 3.3 Implement `processAllAnniversaryGrants(companyId)` function
    - Find all employees at anniversary
    - Process grants in batch
    - Return summary of results
    - _Requirements: 2.5_
  - [x] 3.4 Write property test for anniversary grant with deduction
    - **Property 3: Anniversary Grant with Deduction**
    - Generate random employees with various futureEntitlement and leaveInAdvanceUsed
    - Verify final balance = max(0, future - advance)
    - **Validates: Requirements 2.1, 2.2**
  - [x] 3.5 Write property test for audit log creation
    - **Property 10: Audit Log Creation**
    - Trigger anniversary grants
    - Verify audit log entries created with correct data
    - **Validates: Requirements 2.4**

- [x] 4. Create scheduled job endpoint for anniversary processing
  - [x] 4.1 Create app/api/cron/annual-leave-anniversary/route.ts
    - Implement GET handler for Vercel Cron
    - Call processAllAnniversaryGrants for all companies
    - Return summary of processed grants
    - Add appropriate error handling and logging
    - _Requirements: 2.5_
  - [x] 4.2 Add cron configuration to vercel.json (if using Vercel Cron)
    - Schedule daily run at midnight NZ time
    - _Requirements: 2.5_

- [ ] 5. Checkpoint - Verify schema and grant logic
  - Ensure all tests pass, ask the user if questions arise.
  - Verify migration applied successfully
  - Test anniversary grant logic manually

- [ ] 6. Extend leave request validation for leave in advance
  - [ ] 6.1 Update app/lib/validateLeaveRequest.ts
    - Add check for employee tenure (< 12 months)
    - Allow annual leave requests for pre-12-month employees
    - Add flag to indicate request is "leave in advance"
    - Preserve existing validation logic
    - _Requirements: 3.1, 3.5_
  - [ ] 6.2 Write property test for leave in advance classification
    - **Property 4: Leave In Advance Classification**
    - Generate random leave requests for employees at various tenure lengths
    - Verify correct classification based on 12-month threshold
    - **Validates: Requirements 3.1, 3.2**

- [ ] 7. Update leave approval to track leave in advance
  - [ ] 7.1 Update app/lib/advanceLeaveApproval.ts
    - Check if employee is pre-12-month (no LeaveEntitlement record)
    - If pre-12-month: increment `leaveInAdvanceUsed` instead of LeaveEntitlement.usedDays
    - If post-12-month: use existing LeaveEntitlement deduction logic
    - Add inline comments explaining the distinction
    - _Requirements: 3.2_

- [ ] 8. Implement casual employee handling
  - [ ] 8.1 Update employee creation for casual detection
    - Check contractType or employmentType for "casual" indicator
    - Set `isCasualEmployee = true` for casual employees
    - Skip futureAnnualLeaveEntitlement storage for casuals
    - _Requirements: 4.1, 4.3_
  - [ ] 8.2 Add casual to permanent conversion logic
    - Create helper function to handle status change
    - Set `casualToPermanentDate` to current date
    - Calculate new `annualLeaveEntitlementDate` from conversion date
    - Store `futureAnnualLeaveEntitlement` based on working pattern
    - _Requirements: 4.4_
  - [ ] 8.3 Write property test for casual employee exclusion
    - **Property 5: Casual Employee Exclusion**
    - Generate random casual employees
    - Verify no futureAnnualLeaveEntitlement stored
    - **Validates: Requirements 4.1**
  - [ ] 8.4 Write property test for casual to permanent conversion
    - **Property 6: Casual to Permanent Conversion**
    - Generate random casual employees, convert to permanent
    - Verify annualLeaveEntitlementDate = casualToPermanentDate + 12 months
    - **Validates: Requirements 4.4**

- [ ] 9. Checkpoint - Verify backend logic
  - Ensure all tests pass, ask the user if questions arise.
  - Test leave in advance flow end-to-end
  - Test casual employee handling

- [ ] 10. Update UI components for leave balance display
  - [ ] 10.1 Update app/components/LeaveBalancePanel.tsx
    - Check if employee is pre-12-month (no LeaveEntitlement)
    - Display "Accrued (not yet entitled)" label for pre-12-month employees
    - Show futureAnnualLeaveEntitlement as "Future Entitlement: X days"
    - Show leaveInAdvanceUsed as "Leave in Advance Used: X days"
    - Add tooltip explaining accrual vs entitlement
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.2, 7.3_
  - [ ] 10.2 Update app/components/employees/AddEmployeeModal.tsx
    - Add clarifying text near calculator: "This entitlement will be granted at the 12-month anniversary"
    - Preserve existing calculator functionality
    - _Requirements: 1.4, 5.5_

- [ ] 11. Implement backward compatibility for existing employees
  - [ ] 11.1 Create migration script for existing employees
    - Find employees without LeaveEntitlement who are under 12 months
    - Calculate and populate futureAnnualLeaveEntitlement
    - Calculate and populate annualLeaveEntitlementDate
    - _Requirements: 6.4_
  - [ ] 11.2 Verify existing LeaveEntitlement records are preserved
    - Query existing records before and after migration
    - Verify no modifications or deletions
    - _Requirements: 6.1, 6.2, 6.5_
  - [ ] 11.3 Write property test for existing records preservation
    - **Property 7: Existing Records Preservation**
    - Generate employees with existing LeaveEntitlement records
    - Run new logic
    - Verify records unchanged
    - **Validates: Requirements 6.1, 6.2, 6.5**

- [ ] 12. Add reporting visibility for upcoming anniversaries
  - [ ] 12.1 Create API endpoint for upcoming anniversaries
    - Add GET endpoint to return employees within 30 days of anniversary
    - Include futureAnnualLeaveEntitlement and leaveInAdvanceUsed in response
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 12.2 Write property test for upcoming anniversary query
    - **Property 8: Upcoming Anniversary Query**
    - Generate random employees with various anniversary dates
    - Verify query returns correct employees within range
    - **Validates: Requirements 7.1**
  - [ ] 12.3 Update leave reports to distinguish entitled vs advance leave
    - Modify report generation to include leaveInAdvanceUsed
    - Add separate columns/sections for entitled leave and leave in advance
    - _Requirements: 7.4_
  - [ ] 12.4 Write property test for report distinction
    - **Property 9: Report Distinction**
    - Generate random leave data
    - Verify report output distinguishes entitled vs advance
    - **Validates: Requirements 7.4**

- [ ] 13. Final checkpoint - Full integration testing
  - Ensure all tests pass, ask the user if questions arise.
  - Test complete employee lifecycle: creation → leave in advance → anniversary grant
  - Verify UI displays correct information at each stage
  - Test casual employee flow
  - Verify backward compatibility with existing data

## Notes

- All property-based tests are required for comprehensive validation
- Each task references specific requirements for traceability
- Run tests using `npx tsx test` in terminal
- Property-based tests should use fast-check library for random input generation
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All schema changes are additive to preserve backward compatibility
- Existing pro-rata calculator in AddEmployeeModal is preserved unchanged
