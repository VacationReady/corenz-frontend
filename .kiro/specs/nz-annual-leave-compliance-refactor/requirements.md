# Requirements Document

## Introduction

This document specifies the requirements for refactoring PeopleCore's annual leave entitlement logic to comply with the New Zealand Holidays Act 2003. This is a targeted, compliance-driven refactor of existing functionality—not a rebuild. The goal is to preserve existing UX, components, and flows while ensuring legal correctness for NZ employers.

## Glossary

- **Annual_Leave_Entitlement**: The legal right to paid annual leave, which crystallises at the 12-month employment anniversary under NZ law
- **Leave_In_Advance**: Annual leave taken before the employee has completed 12 months of continuous employment; must be explicitly recorded and deducted from future entitlement
- **Accrued_Leave**: A calculated display value showing leave accumulating over time (8% of gross earnings equivalent); informational only, not a legal entitlement until 12 months
- **Entitlement_Crystallisation**: The point at which accrued leave becomes a legal entitlement (12-month anniversary)
- **Pro_Rata_Calculator**: The existing AddEmployeeModal calculator that determines annual leave entitlement based on working pattern (days per week ÷ 5 × full-time entitlement)
- **Casual_Employee**: An employee with no guaranteed hours who receives 8% holiday pay instead of accruing annual leave
- **Holiday_Pay_8_Percent**: The 8% gross earnings payment that casual employees receive in lieu of annual leave entitlement
- **Future_Entitlement**: The calculated leave amount stored at employee creation, to be granted at the 12-month anniversary
- **Employee_Record**: The Employee model in Prisma containing leave balances and employment dates
- **Leave_Entitlement_Record**: The LeaveEntitlement model linking employees to event categories with totalDays and usedDays

## Requirements

### Requirement 1: Defer Annual Leave Entitlement Grant

**User Story:** As an HR administrator, I want the system to defer granting annual leave entitlement until the employee's 12-month anniversary, so that we comply with the NZ Holidays Act 2003.

#### Acceptance Criteria

1. WHEN a new employee is created, THE System SHALL store the calculated entitlement as a future entitlement value rather than creating an active LeaveEntitlement record
2. WHEN a new employee is created, THE System SHALL record the employment start date for anniversary calculation
3. WHEN a new employee is created, THE System SHALL calculate and store the 12-month anniversary date (entitlement crystallisation date)
4. THE Pro_Rata_Calculator SHALL remain functional and visible in AddEmployeeModal
5. THE Pro_Rata_Calculator output SHALL be stored as a pending/future entitlement, not an active balance

### Requirement 2: Automatic Entitlement Grant at 12-Month Anniversary

**User Story:** As an HR administrator, I want the system to automatically grant annual leave entitlement at the 12-month anniversary, so that employees receive their legal entitlement without manual intervention.

#### Acceptance Criteria

1. WHEN an employee reaches their 12-month employment anniversary, THE System SHALL automatically create a LeaveEntitlement record with the stored future entitlement value
2. WHEN entitlement crystallises, THE System SHALL deduct any recorded leave in advance from the granted entitlement
3. IF leave in advance exceeds the entitlement amount, THEN THE System SHALL set the balance to zero and flag for HR review
4. WHEN entitlement is granted, THE System SHALL record an audit log entry documenting the grant
5. THE System SHALL support a scheduled job or trigger mechanism to process anniversary grants

### Requirement 3: Leave In Advance Tracking

**User Story:** As an HR administrator, I want to record leave taken before the 12-month anniversary as "leave in advance", so that it can be properly deducted when entitlement crystallises.

#### Acceptance Criteria

1. WHEN an employee with less than 12 months service requests annual leave, THE System SHALL classify the request as leave in advance
2. WHEN leave in advance is approved, THE System SHALL record it separately from entitled leave usage
3. THE System SHALL display leave in advance balance distinctly from accrued/entitled leave
4. WHEN viewing an employee's leave balance before 12 months, THE System SHALL clearly indicate that displayed accrual is not yet a legal entitlement
5. THE Leave_Request workflow SHALL continue to function for leave in advance requests

### Requirement 4: Casual Employee Exclusion

**User Story:** As an HR administrator, I want casual employees to be excluded from annual leave accrual, so that they receive 8% holiday pay instead as required by NZ law.

#### Acceptance Criteria

1. WHEN an employee is marked as casual, THE System SHALL NOT create future annual leave entitlement records
2. WHEN an employee is marked as casual, THE System SHALL NOT display annual leave accrual or balance
3. THE System SHALL provide a mechanism to identify casual employees (via contract type or employment type field)
4. WHEN a casual employee's status changes to permanent, THE System SHALL begin tracking their 12-month anniversary from the status change date
5. THE System SHALL support recording 8% holiday pay for casual employees (display/reporting only, not automatic calculation)

### Requirement 5: UI Copy Clarification

**User Story:** As an employee, I want clear labelling that distinguishes between accrued leave and entitled leave, so that I understand my actual legal entitlement.

#### Acceptance Criteria

1. WHEN displaying leave balance for employees under 12 months, THE System SHALL label it as "Accrued (not yet entitled)" or similar
2. WHEN displaying leave balance for employees over 12 months, THE System SHALL label it as "Annual Leave Entitlement"
3. WHEN an employee has taken leave in advance, THE System SHALL display "Leave in Advance Used: X days"
4. THE System SHALL provide tooltip or help text explaining the difference between accrual and entitlement
5. THE AddEmployeeModal SHALL clarify that the calculated entitlement will be granted at 12 months

### Requirement 6: Backward Compatibility

**User Story:** As an HR administrator, I want existing employee records and leave history to remain valid, so that historical data is not corrupted by this refactor.

#### Acceptance Criteria

1. THE System SHALL NOT invalidate or delete existing LeaveEntitlement records
2. THE System SHALL NOT modify historical LeaveRequest records
3. WHEN schema changes are required, THE System SHALL use additive migrations only
4. THE System SHALL provide a migration path for existing employees who have not yet reached 12 months
5. IF an existing employee already has a LeaveEntitlement record, THEN THE System SHALL treat them as having crystallised entitlement

### Requirement 7: Reporting and Visibility

**User Story:** As an HR administrator, I want to see which employees are approaching their 12-month anniversary, so that I can prepare for entitlement grants.

#### Acceptance Criteria

1. THE System SHALL provide visibility into employees approaching their 12-month anniversary (within 30 days)
2. THE System SHALL display the future entitlement amount for employees under 12 months
3. THE System SHALL show leave in advance balance for employees who have taken advance leave
4. WHEN generating leave reports, THE System SHALL distinguish between entitled leave and leave in advance
