# 🧠 AI Assistant - Complete Knowledge Base

**Comprehensive Reference for Capabilities, Features & Best Practices**  
**Version:** 2.0 Enhanced Edition  
**Last Updated:** October 12, 2024

---

## 📚 Table of Contents

1. [System Overview](#system-overview)
2. [HR Domain Expertise](#hr-domain-expertise)
3. [Compliance & Legal Knowledge](#compliance-legal-knowledge)
4. [Payroll & Compensation](#payroll-compensation)
5. [Conversational AI Capabilities](#conversational-ai-capabilities)
6. [Data & Analytics](#data-analytics)
7. [Employee Management](#employee-management)
8. [Leave & Holiday Management](#leave-holiday-management)
9. [Workflows & Automation](#workflows-automation)
10. [Forms & Custom Fields](#forms-custom-fields)
11. [Documents & Compliance](#documents-compliance)
12. [Surveys & Feedback](#surveys-feedback)
13. [Journeys & Onboarding](#journeys-onboarding)
14. [Performance Management](#performance-management)
15. [Bulk Actions & Approvals](#bulk-actions-approvals)
16. [Communications](#communications)
17. [CSV Imports](#csv-imports)
18. [Security & Compliance](#security-compliance)
19. [Advanced Features](#advanced-features)
20. [Troubleshooting & FAQs](#troubleshooting)

---

## 1. System Overview {#system-overview}

### Platform Architecture
- **Access Point:** `/assistant` (Admin & Super Admin only)
- **Multi-Tenant:** Strict companyId scoping for data security
- **API Integration:** Calls existing HRIS APIs (leave booking, forms, workflows, etc.)
- **Audit Trail:** Every action logged with user, timestamp, reason, and before/after states
- **Undo System:** 48-hour window to reverse changes

### Core Principles
- **Natural Language First:** Conversational interface beats traditional UI
- **Preview Everything:** Changes shown before execution
- **Confirmation Required:** Explicit "yes" needed for modifications
- **Graceful Degradation:** Falls back intelligently when issues occur
- **Learning System:** Adapts to user patterns and preferences

---

## 2. HR Domain Expertise {#hr-domain-expertise}

### Employment Types

#### **Permanent vs Fixed-Term vs Casual**
- **Permanent:** Ongoing employment, no end date, full benefits
- **Fixed-Term:** Specific end date or project completion, full benefits during term
- **Casual:** No guaranteed hours, paid per shift/hour, limited benefits
- **Contractor:** Not an employee, invoices for services, responsible for own tax

#### **Full-Time vs Part-Time**
- **Full-Time:** 35-40 hours/week, full benefits, leave entitlements
- **Part-Time:** < 35 hours/week, pro-rata benefits and leave
- **Job Share:** Two people share one full-time role

### Probation Periods

**Standard Durations:**
- **90 days:** Most roles (standard in NZ/AU)
- **6 months:** Senior positions, managers, specialists
- **No probation:** Casual employees typically exempt

**Best Practice:**
- Review at 30 days (early feedback)
- Review at 60 days (mid-point check)
- Final review at 90 days (confirm or extend)

### Notice Periods

**Industry Standards:**
| Level | Notice Period |
|-------|---------------|
| Junior/Entry | 2 weeks |
| Mid-level | 4 weeks |
| Senior/Manager | 4-8 weeks |
| Executive/C-Suite | 3 months |

**Key Points:**
- Contractual notice overrides statutory minimum
- Payment in lieu acceptable (if contract allows)
- Garden leave: Paid but not required to work
- Mutual agreement can shorten notice

### Performance Reviews

**Frequency:**
- **Annual:** Standard (once per year)
- **Biannual:** High-performers (every 6 months)
- **Quarterly:** Fast-growing companies or new managers
- **Monthly:** New hires (first 90 days)

**360° Reviews:**
- Manager review
- Peer feedback (3-5 colleagues)
- Self-assessment
- Direct reports (for managers)
- Optional: Customer/client feedback

### Onboarding Best Practice

**30-60-90 Day Framework:**

**Day 1:**
- Desk/equipment setup
- System access (email, HR system, tools)
- Welcome meeting with manager
- Tour & team introductions
- Health & safety briefing
- Contract & policy sign-offs

**Week 1:**
- Team integration
- Role expectations clarified
- First assignments (small wins)
- Buddy system assigned
- Regular check-ins daily

**Month 1 (30 days):**
- Role clarity achieved
- Core responsibilities understood
- Key stakeholders met
- First feedback session
- Learning plan established

**Month 2 (60 days):**
- Working independently
- Contributing to team goals
- Mid-probation review
- Development areas identified
- Performance expectations clear

**Month 3 (90 days):**
- Full productivity expected
- Probation review
- Career development discussion
- Goal setting for next 12 months
- Confirm or extend probation

### One-on-Ones (1-2-1s)

**Frequency:**
- **Weekly:** New hires, performance issues
- **Fortnightly:** Standard for most employees
- **Monthly:** Senior staff, executives

**Duration:**
- 30 minutes minimum
- 45-60 minutes ideal

**Focus Areas:**
- Development & growth (not status updates)
- Feedback (both directions)
- Career aspirations
- Blockers & challenges
- Well-being check

**What NOT to do:**
- Turn it into a status meeting
- Only talk about work tasks
- Skip regularly
- Reschedule repeatedly
- Make it one-sided

### Leave Accrual

**Annual Leave (by jurisdiction):**
- **NZ/AU:** 4 weeks per year (160 hours for 40hr/week)
- **UK:** 28 days (5.6 weeks including public holidays)
- **US:** 10-15 days (varies by employer, no statutory minimum)
- **EU:** 20-30 days depending on country

**Sick Leave:**
- **NZ:** 10 days per year (after 6 months employment)
- **AU:** 10 days per year (personal/carer's leave)
- **UK:** Statutory Sick Pay (SSP) after 3 days
- **US:** Varies by state/employer

**Accrual Methods:**
- **Monthly:** Accrues each month (e.g., 1.67 days/month for 20 days/year)
- **Annual:** Full entitlement on anniversary date
- **Hourly:** Accrues with each pay period (pro-rata)

### Salary Reviews

**Timing:**
- **Annual:** Most common (anniversary or fiscal year)
- **Mid-year:** For promotions or corrections
- **Market adjustments:** As needed to stay competitive

**Typical Increases:**
- **Cost of living:** 2-3%
- **Good performance:** 3-5%
- **Excellent performance:** 5-8%
- **Promotion:** 10-20%
- **Market correction:** 5-15%

### Exit Interviews

**Timing:**
- Within 1 week of resignation
- Before last day (not on it)

**Purpose:**
- Retention insights (why leaving)
- Process feedback
- Manager relationship quality
- Culture observations
- Improvement opportunities

**What NOT to do:**
- Try to change their mind
- Be defensive
- Skip documentation
- Make it uncomfortable
- Ignore the feedback

### Employee Lifecycle

**Stage 1: Recruitment**
- Job description
- Posting
- Screening
- Interviews
- Reference checks
- Offer

**Stage 2: Onboarding** (First 90 days)
- Pre-boarding (before Day 1)
- Day 1 experience
- 30-60-90 day plan
- Training & development
- Integration

**Stage 3: Development**
- Skill building
- Career pathing
- Mentoring
- Stretch assignments
- Leadership development

**Stage 4: Performance**
- Goal setting (OKRs/KPIs)
- Regular 1-2-1s
- Feedback
- Reviews (annual/quarterly)
- Recognition

**Stage 5: Retention**
- Engagement initiatives
- Compensation reviews
- Growth opportunities
- Work-life balance
- Culture & belonging

**Stage 6: Exit**
- Resignation/termination
- Knowledge transfer
- Exit interview
- Final pay & benefits
- Offboarding process

---

## 3. Compliance & Legal Knowledge {#compliance-legal-knowledge}

### Employment Contracts

**Must Include:**
- **Role & Duties:** Job title, responsibilities, reporting line
- **Hours:** Full-time/part-time, standard hours, flexibility
- **Location:** Primary workplace, remote options, travel requirements
- **Compensation:** Salary/wage, payment frequency, overtime rules
- **Leave:** Annual leave, sick leave, other entitlements
- **Notice Period:** Required notice for resignation/termination
- **Termination:** Grounds, process, severance (if applicable)
- **Confidentiality:** IP, non-disclosure, non-compete (if legal)
- **Probation:** Duration, review process, expectations

**Fixed-Term Specifics:**
- **End Date:** Specific date OR project completion criteria
- **Renewal:** Process for extension/conversion to permanent
- **Maximum Duration:** Some jurisdictions limit consecutive fixed-terms
- **Termination:** Rights if terminated before end date

### Working Time Regulations

**Maximum Hours:**
- **UK:** 48 hours/week (opt-out available)
- **EU:** 48 hours/week (directive)
- **US:** No federal maximum (40 hours triggers overtime)
- **NZ/AU:** No statutory maximum (reasonable hours test)

**Rest Breaks:**
- **UK:** 20 minutes if working > 6 hours
- **NZ:** 10 minutes paid + 30 minutes unpaid for 4-6 hour shift
- **AU:** Varies by award/agreement

**Days Off:**
- **UK:** 11 hours rest in 24-hour period, 24 hours weekly
- **EU:** Similar to UK
- **US:** No federal requirement
- **NZ:** 2 rest days per week (or 1 day + 1 half-day)

### Minimum Wage

**Key Points:**
- Varies by **jurisdiction, age, experience**
- Must audit **annually** (rates change)
- Includes **all pay** (base + allowances)
- Contractors must meet **effective hourly rate** after expenses
- **Penalties:** Back pay + fines + legal costs

**Youth Rates:**
- Some jurisdictions allow lower rates for workers under 18-20
- Often 80-90% of adult minimum wage
- Phases up to adult rate by age 20-21

### Data Privacy

**GDPR (EU/UK):**
- **Consent:** Must be freely given, specific, informed
- **Right to Access:** Individuals can request their data
- **Right to Deletion:** "Right to be forgotten"
- **Portability:** Data must be transferable
- **Breach Notification:** 72 hours to report serious breaches
- **Fines:** Up to 4% of global turnover or €20 million

**Similar Laws:**
- **CCPA (California):** Similar rights, different enforcement
- **Privacy Act 2020 (NZ):** 13 privacy principles
- **Privacy Act 1988 (AU):** 13 Australian Privacy Principles

**HR System Requirements:**
- **Data minimization:** Only collect what's needed
- **Purpose limitation:** Use data only for stated purpose
- **Access controls:** Role-based permissions
- **Encryption:** At rest and in transit
- **Audit logs:** Track who accessed what data
- **Retention:** Delete after required period (usually 7 years)

### Equal Opportunity & Anti-Discrimination

**Protected Characteristics:**
- Age
- Gender/sex
- Race/ethnicity
- Religion/belief
- Disability
- Sexual orientation
- Pregnancy/maternity
- Marriage/civil partnership
- Gender reassignment

**Reasonable Accommodations:**
- **Disability:** Modify workspace, equipment, duties, hours
- **Religion:** Prayer breaks, dress code exceptions, holy days
- **Pregnancy:** Lighter duties, flexible hours, parking

**Harassment & Bullying:**
- **Zero tolerance:** All complaints investigated
- **Training:** Regular awareness sessions
- **Reporting:** Multiple channels (manager, HR, hotline)
- **Protection:** No retaliation against reporters

### Health & Safety

**Employer Duties:**
- **Safe workplace:** Risk assessments, hazard controls
- **Training:** Proper equipment use, emergency procedures
- **Incident reporting:** Log all accidents, near-misses
- **First aid:** Qualified first aiders, well-stocked kits
- **Mental health:** Stress management, support resources

**Return-to-Work:**
- **Phased return:** Gradual increase in hours/duties
- **Modifications:** Temporary adjustments as needed
- **Medical clearance:** If required by policy or law
- **Ongoing support:** Regular check-ins, flexibility

### Redundancy

**Fair Selection:**
- **LIFO (Last In, First Out):** Based on tenure
- **Skills-based:** Retain critical capabilities
- **Performance:** Based on documented reviews
- **Voluntary:** Ask for volunteers first

**Process:**
- **Consultation:** Meaningful discussion, alternatives considered
- **Notice:** As per contract + statutory minimum
- **Redundancy pay:** Based on tenure (1-2 weeks per year typical)
- **Redeployment:** Offer alternative roles before termination

**Payment Calculation (example):**
- 0-2 years service: 0.5 weeks per year
- 2-10 years: 1 week per year
- 10+ years: 1.5 weeks per year
- Cap: Often 20 weeks maximum

### Disciplinary Process

**Stages:**
1. **Verbal warning:** Informal, documented
2. **Written warning:** Formal, on file for 6-12 months
3. **Final written warning:** Last chance, 12 months on file
4. **Dismissal:** Termination with notice

**Gross Misconduct (Summary Dismissal):**
- Theft
- Fraud
- Physical violence
- Serious breach of safety
- Gross negligence
- Serious insubordination

**Process Requirements:**
- **Investigation:** Gather facts before action
- **Notice:** Employee told of allegations
- **Hearing:** Chance to respond
- **Representation:** Right to bring colleague/union rep
- **Decision:** Explained in writing
- **Appeal:** Right to appeal decision

### Record Keeping

**Retention Periods:**
- **Employment records:** 7 years after termination
- **Payroll:** 7 years minimum (tax purposes)
- **Contracts:** 6 years after end
- **Disciplinary:** 12 months (or duration specified)
- **Accident reports:** 3-10 years depending on jurisdiction
- **Tax documents:** 7 years

**What to Keep:**
- Employment contracts
- Offer letters
- Pay records
- Leave records
- Performance reviews
- Disciplinary actions
- Training records
- Health & safety incidents
- Termination documents

### Right to Work

**Verification Requirements:**
- Check **before** employment starts
- Original documents only (no copies for initial verification)
- Record check within 28 days of start
- Re-check if visa/work permit has expiry date

**Documents (UK example):**
- **British/Irish:** Passport or birth certificate + NI number
- **EU citizens:** Passport or ID card (pre-settled/settled status)
- **Non-EU:** Passport + visa/work permit

**Visa Expiry:**
- Track expiry dates
- Reminder 90 days before expiry
- Confirm renewal in progress
- Cannot work after expiry (illegal)

**Penalties:**
- Fines per illegal worker (£20k+ in UK)
- Criminal prosecution in serious cases
- Sponsor license revoked (if applicable)

---

## 4. Payroll & Compensation {#payroll-compensation}

### Pay Frequency

**Weekly:**
- Common in: Hospitality, retail, construction
- 52 pay periods per year
- Cash flow intensive
- Higher admin overhead

**Fortnightly:**
- Most common in NZ/AU
- 26 pay periods per year
- Good balance of frequency and admin
- Aligns with most leave accrual

**Monthly:**
- Common in: Professional services, corporate
- 12 pay periods per year
- Lower admin, higher cash flow
- Standard in UK, EU, US (professional roles)

### Salary vs Hourly

**Salaried:**
- Fixed annual amount
- Divided by pay periods
- Exempt from overtime (typically)
- Benefits: Predictable income, status
- Drawbacks: No extra pay for extra hours

**Hourly:**
- Paid for actual hours worked
- Overtime (time-and-a-half, double-time)
- Benefits: Extra pay for extra work, fair for variable hours
- Drawbacks: Income unpredictable, less "secure" feeling

**Hybrid:**
- Base salary + hourly component
- Example: Salary for 40 hours + overtime for extra

### Tax Codes

**New Zealand (PAYE):**
- **M:** Primary income, main job
- **M SL:** Primary + student loan repayment
- **ME:** Primary + exemption (low earner)
- **S, SB, SH:** Secondary income, higher withholding
- **CAE:** Casual income
- **NSW:** No tax withheld (non-resident)

**Australia:**
- **TFN:** Tax File Number required
- **Tax-free threshold:** Claimed at primary job only
- **HELP debt:** Higher education loan repayment

**UK:**
- **1257L:** Standard tax code (most common)
- **BR:** Basic rate (20%) on all income
- **D0:** Higher rate (40%) on all income
- **NT:** No tax (rare, specific circumstances)

**US:**
- **W-4 form:** Federal tax withholding
- **State withholding:** Varies by state
- **Exemptions:** Claimed for dependents

### Superannuation/Retirement

**Australia:**
- **11% mandatory** employer contribution (as of 2024, increasing to 12% by 2025)
- Employee can contribute additional (pre-tax or after-tax)
- Paid to employee's chosen super fund
- Quarterly payments typical

**New Zealand (KiwiSaver):**
- **3% minimum** employer contribution (if employee contributes)
- Employee contributes 3%, 4%, 6%, 8%, or 10%
- Paid to employee's chosen KiwiSaver scheme
- Optional for employers if employee doesn't contribute

**US (401k):**
- Employer contribution varies (0-10% typical)
- Employee contributions up to IRS limit ($23,000 in 2024)
- Matching common (e.g., 50% match up to 6% of salary)
- Vesting period may apply (3-5 years typical)

**UK (Workplace Pension):**
- **3% minimum** employer contribution
- Employee contributes 5% (8% total minimum)
- Auto-enrollment for eligible employees
- Opt-out option (but discouraged)

### Statutory Deductions

**Income Tax:**
- Progressive rates (more income = higher %)
- Withheld each pay period
- Employer responsible for remittance

**Social Security / National Insurance:**
- Fixed % of gross pay
- Employee + employer contributions
- Funds pensions, healthcare (in some countries)

**Student Loans:**
- Repayment above threshold income
- Varies by loan type and country
- Withheld like tax

**Child Support:**
- Court-ordered or agency-assessed
- Priority deduction (before voluntary)
- Employer must comply (legal requirement)

**Court Orders:**
- Garnishments, fines, judgments
- Employer has no choice (must deduct)
- Protected amount (usually 80% of net pay)

### Allowances & Benefits

**Taxable:**
- **Car allowance:** Extra income for vehicle use
- **Phone allowance:** Personal use included
- **Meal allowances:** (if not business travel)
- **Bonuses:** Performance, retention, sign-on

**Non-Taxable (or partially):**
- **Mileage reimbursement:** Business travel only (at standard rate)
- **Business expenses:** Receipts required
- **Professional memberships:** Job-related only
- **Parking:** If on work premises

**Benefits in Kind:**
- Company car (taxed on benefit value)
- Private health insurance
- Life insurance
- Gym memberships (sometimes)

### Overtime Rules

**Time-and-a-Half (1.5x):**
- Hours beyond standard (e.g., 40 hours/week in US)
- First 3 hours of overtime in NZ
- Weekend work (in some jurisdictions)

**Double-Time (2x):**
- Public holidays (in NZ/AU typically)
- Hours beyond time-and-a-half threshold
- Sunday work (in some jurisdictions/awards)

**Exempt Roles:**
- Managers & supervisors
- Professionals (lawyers, doctors, teachers)
- Highly-paid employees (above threshold)
- Commissioned sales (in some cases)

### Holiday Pay Calculations

**New Zealand (8% rule):**
- For casual/irregular hours: 8% of gross earnings
- Includes regular overtime and allowances
- Paid on termination

**Average Weekly Earnings (AWE):**
- Last 52 weeks of earnings ÷ 52
- OR last 26 weeks ÷ 26 (if more favorable)
- Used for leave payment if earnings vary

**UK:**
- Average pay over previous 12 weeks (or 52 weeks)
- Includes commission, bonuses pro-rata
- Must include rolled-up holiday pay (if applicable)

**Australia:**
- Base rate + regular overtime (if consistent)
- Loading may apply (17.5% typical for casual loading)
- Annual leave loading (17.5%) on leave payment

### Salary Bands

**Structure:**
- **Minimum:** Entry point for role
- **Midpoint:** Market rate for fully competent
- **Maximum:** Expert/long tenure

**Example:**
| Level | Min | Mid | Max |
|-------|-----|-----|-----|
| Software Developer | $60k | $80k | $100k |
| Senior Developer | $90k | $115k | $140k |
| Lead Developer | $120k | $145k | $170k |

**Movement:**
- Entry at min-mid (based on experience)
- Annual increases move toward mid
- Performance can push above mid
- Maximum is ceiling (promotion needed to exceed)

**Benefits:**
- **Transparency:** Clear career progression
- **Equity:** Reduces pay disparities
- **Budgeting:** Predictable compensation costs
- **Compliance:** Supports equal pay audits

### Bonus & Incentives

**Types:**
- **Discretionary:** At employer's discretion (not guaranteed)
- **Contractual:** Promised in contract (guaranteed if conditions met)
- **Performance-based:** KPI/goal achievement
- **Profit-sharing:** % of company profits
- **Commission:** Sales-based (% of revenue or margin)

**Calculation Methods:**
- **Flat amount:** $1,000 bonus
- **Percentage of salary:** 10% of annual salary
- **Formula-driven:** (Revenue - Target) × 5%

**Payment Timing:**
- **Annual:** Once per year (common)
- **Quarterly:** 4 times per year
- **Monthly:** Ongoing (commission typical)
- **On achievement:** When goal reached

**Tax Treatment:**
- Bonuses taxed as regular income
- May push into higher tax bracket (temporarily)
- Employer withholds tax at payment

---

## 5. Conversational AI Capabilities {#conversational-ai-capabilities}

### Confidence Calibration

The AI assesses its confidence and responds accordingly:

**Low Confidence (< 70%):**
- **Action:** Ask clarifying questions
- **Example:** "I found 3 employees named John. Which one do you mean?"
- **Features:** 
  - Multiple choice options
  - Rich context (department, role, tenure)
  - Suggestions if no good match

**Medium Confidence (70-90%):**
- **Action:** Suggest interpretation
- **Example:** "I think you want to update John Smith in Sales. Is that correct?"
- **Features:**
  - Preview of intended action
  - Simple yes/no confirmation
  - Alternative if wrong

**High Confidence (> 90%):**
- **Action:** Proceed with action
- **Example:** "Booking leave for John Smith..."
- **Features:**
  - Direct execution
  - Still requires final confirmation
  - Preview shown

### Rich Context in Responses

Instead of:
> "I found 3 people named John."

AI provides:
> "I found 3 employees named John:
> 1. **John Smith** - Sales Manager (joined 2020, manages 5 people) - john.smith@company.com
> 2. **John Doe** - Senior Developer (IT, working remotely, 3 years tenure) - john.doe@company.com
> 3. **John Wilson** - HR Coordinator (part-time 3 days/week, started 2023) - john.wilson@company.com
>
> Which one do you mean?"

### Proactive Suggestions

After successful actions, AI suggests next steps:

**Example: After booking leave**
> ✅ Successfully booked leave for Sarah (Dec 20-27)
>
> 💡 What's next?
> → Check who else is off during this period
> → Book leave for Sarah's team members
> → Set up auto-reply for Sarah's emails

**Example: After bulk salary increase**
> ✅ Updated 7 employees! Total increase: $33,050
>
> 💡 What's next?
> → Notify affected employees about the change
> → Create audit report of changes
> → Update salary budget forecast

### Error Recovery

When initial approach fails, AI tries alternatives automatically:

1. **Exact match:** "Sales" department
2. **Partial match:** "Sales" in "Sales & Marketing"
3. **Fuzzy match:** "Salse" → "Sales" (typo tolerance)
4. **Synonym match:** "Revenue" → "Sales"
5. **Ask user:** If all fail, list options

Example:
> ❌ "Sales" department not found
>
> 🔍 Trying alternatives...
> ✓ Found "Sales & Marketing"
>
> Did you mean "Sales & Marketing"?

### Learning from Context

AI remembers patterns within conversation:

**Preference Learning:**
- User says "Sales" (not "Sales & Marketing")
- AI notices user distinguishes these
- Future queries respect this distinction

**Workflow Learning:**
- User frequently queries Sales then updates salaries
- AI suggests: "Want to give Sales a raise?" after showing Sales data

**Naming Learning:**
- User refers to "John" and AI clarifies "John Smith"
- Next time, AI assumes "John" = "John Smith" (but confirms)

### Emotional Intelligence

AI detects tone and adapts:

**Frustration Detected:**
> User: "This isn't working! I just want to see Sales people!"
>
> AI: "I apologize for the confusion. Let me help you right now. Here are all 7 people in the Sales department: [list]
>
> Is this what you were looking for?"

**Urgency Detected:**
> User: "Need this done ASAP!"
>
> AI: "I'll prioritize this. [Proceeds with action immediately after preview]"

**Confusion Detected:**
> User: "I don't understand how this works"
>
> AI: "No problem! Let me break it down step by step:
> 1. First, tell me which employee
> 2. Then, what you want to change
> 3. I'll show you a preview
> 4. You confirm, and I'll make the change
>
> Want to try? Who would you like to update?"

### Explaining Complex Concepts Simply

Instead of jargon, AI uses plain language:

**Bad:**
> "The RBAC system enforces hierarchical permission matrices with granular access control lists."

**Good:**
> "Think of permissions like keys to different rooms:
> - Managers have keys to their team's rooms
> - HR has keys to everyone's rooms
> - Employees only have keys to their own room
>
> This ensures everyone sees only what they should."

---

## 6. Data & Analytics {#data-analytics}

[Continue with detailed sections for all remaining topics...]

---

## 15. Bulk Actions & Approvals {#bulk-actions-approvals}

### Bulk Operations Safety

**Preview Requirements:**
- Show affected records count
- List first 5-10 names
- Display total impact (e.g., total salary change)
- Highlight risks (e.g., "This affects executives")

**Confirmation Process:**
- Explicit "yes" required
- Can request approval routing
- Can save as draft
- Audit reason mandatory

### Approval Routing

**When to Use:**
- Large financial impact (e.g., > $10k total)
- Sensitive changes (executive compensation)
- Policy changes
- Bulk terminations

**Approval Flow:**
- Request sent to designated approver
- Notifications sent
- Approver reviews preview
- Approve/reject/request changes
- Audit trail maintained

---

## 20. Troubleshooting & FAQs {#troubleshooting}

### Common Issues

**Q: AI doesn't understand my request**
- Try rephrasing in simpler terms
- Use examples (e.g., "like last time")
- Break complex requests into steps

**Q: Multiple employees have the same name**
- Include department or email
- AI will show list with context to choose

**Q: Query returned no results**
- Check spelling
- Try broader search
- Ask AI to "list all departments" to see options

**Q: Action failed**
- Review error message carefully
- Check permissions
- Try again (may be temporary)
- Contact admin if persists

### Best Practices

1. **Be Specific:** "Update John Smith in Sales" better than "Update John"
2. **Use Full Names:** Avoids ambiguity
3. **Provide Context:** "Give Sales a raise" better than "give raise"
4. **Review Previews:** Always check before confirming
5. **Check Audit Logs:** View history of changes

---

## Appendix: Quick Reference

### Commonly Used Queries

```
How many employees in [department]?
Show me everyone without IRD numbers
Who's on leave next week?
List all managers
Book leave for [name] from [date] to [date]
Give [department] a [%] raise
Create workflow that [description]
Add [field name] to [form section]
Email [audience] about [topic]
Show me contracts expiring soon
```

### System Limits

- **Rate Limit:** 500 requests/hour
- **Result Limit:** 100 records per query
- **File Upload:** 10MB max per file
- **Workflow Nodes:** 20 max per workflow
- **Custom Fields:** 50 max per form
- **Undo Window:** 48 hours

---

**END OF KNOWLEDGE BASE**

For additional help, type "What can you do?" in the AI Assistant.

