# HR AI Assistant - Comprehensive Query Test Plan

This document contains 50+ typical HR queries that the AI assistant should handle correctly. Each query is categorized and includes the expected behavior.

## Category 1: Headcount & Employee Lists (10 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "How many employees do we have?" | employee (count) | Total active employee count |
| "How many people in sales?" | employee (count) | Count of employees in Sales department |
| "List all employees" | employee (findMany) | All active employees with names, departments, roles |
| "Show me everyone in engineering" | employee (findMany) | All employees in Engineering dept |
| "Who works in marketing?" | employee (findMany) | All Marketing employees |
| "List sales team" | employee (findMany) | All Sales employees |
| "How many active employees?" | employee (count) | Active employee count (should be same as Q1) |
| "Show inactive employees" | employee (findMany) | Employees with isActive=false |
| "Total headcount" | employee (count) | All active employees |
| "Give me a list of all staff" | employee (findMany) | All active employees |

## Category 2: Salary & Compensation (10 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "What's total salary for sales?" | employee (aggregate) | SUM of salaries in Sales |
| "Average salary in IT?" | employee (aggregate) | AVG salary in IT department |
| "Total payroll cost?" | employee (aggregate) | SUM of all active employee salaries |
| "Who earns more than $100k?" | employee (findMany) | Employees with salary > 100000 |
| "Who earns less than $50k?" | employee (findMany) | Employees with salary < 50000 |
| "Highest paid employees" | employee (findMany) | Employees ordered by salary DESC |
| "Show lowest paid staff" | employee (findMany) | Employees ordered by salary ASC |
| "Salary distribution by department" | employee (aggregate) | AVG/SUM grouped by department |
| "What's our monthly payroll?" | employee (aggregate) | Total salary / 12 |
| "Show names with salaries" | employee (findMany) | Names + salary amounts |

## Category 3: Leave & Absence (7 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "Who is on leave today?" | leaveRequest (findMany) | Active leaves (today between start/end, approved) |
| "Who is on leave next week?" | leaveRequest (findMany) | Leaves overlapping next week |
| "Show pending leave requests" | leaveRequest (findMany) | Requests with approvalStatus=PENDING |
| "Who is sick today?" | leaveRequest (findMany) | Sick leave today (approved) |
| "When is the next annual leave?" | leaveRequest (findMany) | Upcoming annual leave |
| "Who has taken the most leave?" | leaveRequest (aggregate) | COUNT grouped by employee, DESC |
| "How much leave does John have left?" | leaveEntitlement (findMany) | John's leave balance |

## Category 4: Reporting Structure (4 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "Who reports into Shay Murray?" | user (findMany) | Direct + indirect reports for Shay |
| "Who reports to Sarah?" | user (findMany) | Direct + indirect reports for Sarah |
| "Show me Alex's team" | user (findMany) | Alex's direct reports |
| "Who is John's manager?" | user (findFirst) | John's manager details |

**CRITICAL**: These queries should NEVER return random employees with salaries. Must return actual reporting structure.

## Category 5: Tenure & Experience (6 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "Who has been here more than 5 years?" | employee (findMany) | Employees where startDate < 5 years ago |
| "Show employees with less than 1 year tenure" | employee (findMany) | Employees where startDate > 1 year ago |
| "Who is in their probation period?" | employee (findMany) | Employees where startDate > 90 days ago |
| "Show new hires from last month" | employee (findMany) | startDate within last 30 days |
| "Who started this year?" | employee (findMany) | startDate >= Jan 1 current year |
| "Longest serving employees" | employee (findMany) | ORDER BY startDate ASC |

## Category 6: Contract & Employment Status (5 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "Contracts expiring in next 30 days" | employee (findMany) | contractEndDate between now and +30 days |
| "How many contractors?" | employee (count) | Count where contractType contains "contractor" |
| "List all permanent employees" | employee (findMany) | contractType contains "permanent" |
| "Who is on fixed-term contracts?" | employee (findMany) | contractType contains "fixed" |
| "Show expiring contracts" | employee (findMany) | Same as Q1 |

## Category 7: Demographics & Diversity (4 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "What is the gender split?" | employee (groupBy) | COUNT grouped by GenderOption |
| "Show employees over 30" | employee (findMany) | dateOfBirth < 30 years ago |
| "Show diversity breakdown" | employee (findMany) | Include GenderOption for all employees |
| "Average age of workforce" | employee (aggregate) | Calculate AVG from dateOfBirth |

## Category 8: Compliance & Documents (4 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "Who is missing IRD numbers?" | employee (findMany) | irdNumber IS NULL |
| "Show employees without tax codes" | employee (findMany) | taxCode IS NULL |
| "Who needs to sign documents?" | document (findMany) | requiresSignature=true, not signed |
| "Show expiring driver licenses" | driverLicence (findMany) | expiryDate upcoming |

## Category 9: Location & Work Arrangements (4 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "Who works remotely?" | employee (findMany) | siteLocation contains "remote" or "WFH" |
| "How many people in each office?" | employee (groupBy) | COUNT grouped by siteLocation |
| "Show Wellington employees" | employee (findMany) | siteLocation contains "Wellington" |
| "Who is full-time vs part-time?" | employee (groupBy) | COUNT grouped by employmentType |

## Category 10: Departments & Organization (4 queries)

| Query | Expected Model | Expected Result |
|-------|---------------|-----------------|
| "How many departments do we have?" | department (count) | Count where active=true |
| "List all departments" | department (findMany) | All active departments |
| "What's the biggest department?" | employee (groupBy) | COUNT by dept, ORDER BY DESC |
| "Show department heads" | department (findMany) | Include head (User) details |

---

## Common Failure Patterns to Avoid

### ❌ WRONG: Returning irrelevant data
**Query**: "Who reports into Shay Murray?"
**Bad Response**: Returns 75 random employees with salaries
**Correct Response**: Returns Shay's direct reports (2-10 people) and indirect reports (if any)

### ❌ WRONG: Ignoring filters
**Query**: "How many contractors?"
**Bad Response**: Returns all employees
**Correct Response**: Returns count of employees where contractType = "Contractor"

### ❌ WRONG: Wrong model selection
**Query**: "Who is on leave today?"
**Bad Response**: Queries employee model
**Correct Response**: Queries leaveRequest model with date filters

### ❌ WRONG: Missing context
**Query**: "Show highest paid"
**Bad Response**: Returns error or random data
**Correct Response**: Returns employees ordered by salaryAmount DESC

---

## Test Execution Checklist

For each query above:
- [ ] AI correctly identifies the model (employee, user, leaveRequest, etc.)
- [ ] AI correctly identifies the query type (count, findMany, aggregate, groupBy)
- [ ] AI generates correct filters (department, date ranges, null checks)
- [ ] AI returns relevant data only (no random employees)
- [ ] Response is formatted clearly for HR users
- [ ] Results match user's intent

---

## Edge Cases to Handle

1. **Ambiguous names**: "Who reports to John?" (multiple Johns exist)
   - Should ask for clarification or show multiple options

2. **Empty results**: "Who works in Legal?" (no Legal department)
   - Should return clear message: "No employees found in Legal department"

3. **Vague queries**: "Show me some data"
   - Should ask clarifying questions instead of returning random results

4. **Typos**: "Who workz remotley?"
   - Should handle common typos and interpret intent

5. **Multiple filters**: "Who in sales earns over $80k?"
   - Should apply both department AND salary filters

---

## Success Criteria

✅ **95% accuracy** on all 50+ queries
✅ **Zero nonsensical responses** (like returning random people with salaries for reporting structure queries)
✅ **Clear error messages** when data is not found
✅ **Handles follow-up questions** with context awareness
✅ **Consistent formatting** across all response types
