# Requirements Document

## Introduction

Replace the underutilized "Upcoming Working Pattern" card on the employee settings page (`/employees/[id]/settings`) with a more valuable "Key Dates & Reminders" card. The current card shows "No upcoming working pattern assigned" for the vast majority of employees, wasting valuable screen real estate. The new card will display important upcoming dates and milestones relevant to the employee, providing actionable information at a glance.

## Glossary

- **Settings_Page**: The employee settings page located at `/employees/[id]/settings`
- **Key_Dates_Card**: The new UI component replacing the Upcoming Working Pattern card
- **Key_Date_Item**: An individual date entry displayed within the Key_Dates_Card
- **Viewer**: The user viewing the employee's settings page (admin, manager, or the employee themselves)

## Requirements

### Requirement 1: Display Key Dates Card

**User Story:** As an admin or manager, I want to see important upcoming dates for an employee at a glance, so that I can proactively manage compliance and milestones.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a Key_Dates_Card in place of the Upcoming Working Pattern card
2. THE Key_Dates_Card SHALL have the title "Key Dates & Reminders"
3. THE Key_Dates_Card SHALL maintain the same visual styling (border, rounded corners, padding, shadow) as the Current Working Pattern card
4. THE Key_Dates_Card SHALL display a list of Key_Date_Items when dates are available
5. WHEN no key dates are available, THE Key_Dates_Card SHALL display "No upcoming key dates" message

### Requirement 2: Contract End Date Display

**User Story:** As an admin, I want to see when a fixed-term employee's contract ends, so that I can plan for renewal or offboarding.

#### Acceptance Criteria

1. WHEN an employee has a contractEndDate set, THE Key_Dates_Card SHALL display it as a Key_Date_Item
2. THE Key_Date_Item for contract end SHALL show the label "Contract Ends"
3. THE Key_Date_Item for contract end SHALL show the formatted date
4. WHEN the contract end date is within 30 days, THE Key_Date_Item SHALL display with a warning indicator

### Requirement 3: Visa Expiry Date Display

**User Story:** As an admin, I want to see when an employee's visa expires, so that I can ensure immigration compliance.

#### Acceptance Criteria

1. WHEN an employee has a visaExpiryDate set, THE Key_Dates_Card SHALL display it as a Key_Date_Item
2. THE Key_Date_Item for visa expiry SHALL show the label "Visa Expires"
3. THE Key_Date_Item for visa expiry SHALL show the formatted date
4. WHEN the visa expiry date is within 90 days, THE Key_Date_Item SHALL display with a warning indicator

### Requirement 4: Trial Period End Date Display

**User Story:** As a manager, I want to see when an employee's trial period ends, so that I can complete their review on time.

#### Acceptance Criteria

1. WHEN an employee has ninetyDayTrialPeriod set to true AND trialPeriodEndDate is set, THE Key_Dates_Card SHALL display it as a Key_Date_Item
2. THE Key_Date_Item for trial period SHALL show the label "Trial Period Ends"
3. THE Key_Date_Item for trial period SHALL show the formatted date
4. WHEN the trial period end date is within 14 days, THE Key_Date_Item SHALL display with a warning indicator

### Requirement 5: Work Anniversary Display

**User Story:** As a manager, I want to see an employee's upcoming work anniversary, so that I can acknowledge their tenure milestone.

#### Acceptance Criteria

1. WHEN an employee has a startDate set, THE Key_Dates_Card SHALL calculate and display the next work anniversary
2. THE Key_Date_Item for anniversary SHALL show the label "Work Anniversary" with the year count (e.g., "5 Year Anniversary")
3. THE Key_Date_Item for anniversary SHALL show the formatted date
4. WHEN the anniversary is within 30 days, THE Key_Date_Item SHALL display with a celebratory indicator

### Requirement 6: Date Sorting and Limiting

**User Story:** As a viewer, I want to see the most urgent dates first, so that I can prioritize my attention.

#### Acceptance Criteria

1. THE Key_Dates_Card SHALL sort Key_Date_Items by date in ascending order (soonest first)
2. THE Key_Dates_Card SHALL display a maximum of 4 Key_Date_Items
3. WHEN more than 4 dates exist, THE Key_Dates_Card SHALL show only the 4 soonest dates
4. THE Key_Dates_Card SHALL only display dates that are in the future or today

### Requirement 7: Date Formatting

**User Story:** As a viewer, I want dates displayed in a readable format, so that I can quickly understand when events occur.

#### Acceptance Criteria

1. THE Key_Date_Item SHALL display dates in "MMM d, yyyy" format (e.g., "Jan 5, 2026")
2. THE Key_Date_Item SHALL display a relative time indicator (e.g., "in 14 days", "tomorrow", "today")
3. WHEN a date is today, THE Key_Date_Item SHALL display "Today" as the relative indicator
