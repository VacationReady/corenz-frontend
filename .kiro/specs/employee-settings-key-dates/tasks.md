# Implementation Plan: Employee Settings Key Dates Card

## Overview

Replace the "Upcoming Working Pattern" card with a "Key Dates & Reminders" card on the employee settings page. The implementation uses server-side rendering with helper functions for date calculations.

## Tasks

- [x] 1. Create key dates helper functions
  - [x] 1.1 Create `lib/employee/key-dates.ts` with KeyDateItem interface and helper functions
    - Define KeyDateItem interface with id, label, date, formattedDate, relativeDays, relativeText, type, indicator
    - Implement `calculateNextAnniversary(startDate: Date, referenceDate: Date)` function
    - Implement `formatRelativeTime(days: number)` function returning "Today", "Tomorrow", "in X days"
    - Implement `buildKeyDates(employee, today)` function that collects and processes all dates
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2_

  - [ ] 1.2 Write property test for anniversary calculation

    - **Property 2: Anniversary Calculation**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 1.3 Write property test for date ordering and limiting
    - **Property 4: Output Ordering and Limiting**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 2. Implement warning indicator logic
  - [x] 2.1 Add warning threshold constants and indicator assignment logic to key-dates.ts
    - Define WARNING_THRESHOLDS object with contract: 30, visa: 90, trial: 14, anniversary: 30
    - Add indicator assignment in buildKeyDates based on relativeDays vs threshold
    - _Requirements: 2.4, 3.4, 4.4, 5.4_

  - [x] 2.2 Write property test for warning indicator assignment

    - **Property 3: Warning Indicator Assignment**
    - **Validates: Requirements 2.4, 3.4, 4.4, 5.4**

- [x] 3. Update settings page to use Key Dates Card
  - [x] 3.1 Modify `app/(withSidebar)/employees/[id]/settings/page.tsx`
    - Import buildKeyDates helper function
    - Fetch additional employee fields: contractEndDate, visaExpiryDate, ninetyDayTrialPeriod, trialPeriodEndDate, startDate
    - Call buildKeyDates to generate key dates array
    - Replace "Upcoming Working Pattern" card with "Key Dates & Reminders" card
    - Render KeyDateItem for each date with appropriate styling
    - Show "No upcoming key dates" when array is empty
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.3, 7.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 5. Write integration property test
  - [ ]* 5.1 Write property test for date type inclusion
    - **Property 1: Date Type Inclusion**
    - **Validates: Requirements 2.1, 3.1, 4.1**

  - [ ]* 5.2 Write property test for date formatting
    - **Property 5: Date Formatting**
    - **Validates: Requirements 7.1, 7.2**

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
