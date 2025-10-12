/**
 * Global system knowledge base for the Corenz HR assistant.
 * Provides structured product knowledge that can be injected into prompts
 * so the AI responds with grounded, non-hallucinatory guidance.
 */

export type KnowledgeSectionId =
  | "platform_overview"
  | "hr_domain_expertise"
  | "compliance_legal_knowledge"
  | "payroll_compensation_knowledge"
  | "conversational_principles"
  | "data_analytics"
  | "employee_management"
  | "leave_holiday_management"
  | "workflows_automation"
  | "forms_custom_fields"
  | "documents_compliance"
  | "surveys_feedback"
  | "journeys_onboarding"
  | "performance_management"
  | "bulk_actions_approvals"
  | "communications_notifications"
  | "csv_imports"
  | "reports_scheduling"
  | "security_compliance"
  | "behaviour_expectations";

export interface KnowledgeSection {
  id: KnowledgeSectionId;
  title: string;
  bullets: string[];
  summary?: string;
  tags?: string[];
}

const SYSTEM_KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
  {
    id: "platform_overview",
    title: "Platform Overview",
    bullets: [
      "The conversational assistant lives at `/assistant` and is limited to ADMIN and SUPER_ADMIN roles.",
      "All AI actions call the existing HRIS APIs: leave booking uses the live entitlement and calendar logic, form creation uses the production builder services, employee updates reuse audit logging, and workflow creation writes to the real automation engine.",
      "System context data (employees, departments, workflows, forms, journeys, CSV history, etc.) is always available for grounding replies.",
      "The system operates as a multi-tenant SaaS platform where all data is strictly scoped by companyId for security and privacy.",
      "Every action is audited, tracked, and can be reversed within 48 hours using the undo system."
    ],
    tags: ["core"],
  },
  {
    id: "hr_domain_expertise",
    title: "HR Domain Expertise & Best Practices",
    bullets: [
      "Employment Types: Understand permanent vs fixed-term vs casual contracts, full-time vs part-time classifications, and employee vs contractor distinctions.",
      "Probation Periods: Standard 90-day probation for most roles, 6 months for senior positions; probation reviews should occur at 30, 60, and 90 days.",
      "Notice Periods: Typically 2 weeks for junior roles, 4 weeks for mid-level, 3 months for senior/executive; contractual notice overrides statutory minimum.",
      "Performance Reviews: Annual reviews are standard; high-performing companies add quarterly check-ins; 360° reviews recommended for managers and above.",
      "Onboarding Best Practice: 30-60-90 day plans; Day 1 admin, Week 1 team integration, Month 1 role clarity, Month 3 performance expectations.",
      "One-on-Ones: Managers should hold 1-2-1s weekly or fortnightly; 30-45 minutes; focused on development, feedback, and support (not status updates).",
      "Leave Accrual: Annual leave typically accrues at 4 weeks per year (NZ/AU), 20-25 days (UK), or 10-15 days (US); sick leave varies by region.",
      "Salary Reviews: Annual is standard; mid-year adjustments for promotions or market corrections; increases typically 2-5% for retention, 10-20% for promotions.",
      "Exit Interviews: Should occur within 1 week of resignation; focus on retention insights, not changing minds; documentation critical for trend analysis.",
      "Employee Lifecycle: Recruitment → Offer → Onboarding → Development → Performance → Retention/Exit → Offboarding; each stage needs defined processes."
    ],
    tags: ["domain", "hr"],
  },
  {
    id: "compliance_legal_knowledge",
    title: "Compliance, Legal & Regulatory Knowledge",
    bullets: [
      "Employment Contracts: Must specify role, hours, location, salary/wage, leave entitlements, notice period, and termination conditions; fixed-term contracts require specific end date or project completion criteria.",
      "Working Time Regulations: Most jurisdictions limit working hours (48 hours/week in UK, 40 hours/week standard in US); rest breaks required (10-30 min per 4-6 hours); mandatory days off.",
      "Minimum Wage: Varies by jurisdiction and age; must audit annually; contractors must meet effective hourly rate after expenses; penalties for non-compliance are severe.",
      "Data Privacy: GDPR (EU/UK) requires consent, right to access, right to deletion, and data portability; similar laws apply in California (CCPA), Australia (Privacy Act), and NZ (Privacy Act 2020).",
      "Equal Opportunity: Discrimination on basis of age, gender, race, religion, disability, sexual orientation is prohibited; reasonable accommodations required for disabilities.",
      "Health & Safety: Employer duty of care for physical and mental health; risk assessments required; incident reporting mandatory; return-to-work plans for injuries.",
      "Redundancy: Fair selection process required; consultation period mandatory; redundancy pay based on tenure (1-2 weeks per year of service typical); re-deployment must be considered first.",
      "Disciplinary Process: Warning stages (verbal → written → final → dismissal); right to representation; investigation before action; documented at every step; summary dismissal only for gross misconduct.",
      "Record Keeping: Employment records must be retained 7 years minimum (varies by jurisdiction); payroll records, tax documentation, contracts, and policies must be accessible.",
      "Right to Work: Employers must verify work authorization; visa expiry tracking critical; penalties for employing unauthorized workers can be substantial."
    ],
    tags: ["compliance", "legal"],
  },
  {
    id: "payroll_compensation_knowledge",
    title: "Payroll & Compensation Expertise",
    bullets: [
      "Pay Frequency: Weekly (hospitality, retail), fortnightly (most common in NZ/AU), monthly (professional services); pay cycles must be consistent and communicated.",
      "Salary vs Hourly: Salaried employees have fixed annual compensation divided by pay periods; hourly employees paid for actual hours worked; overtime rules differ significantly.",
      "Tax Codes: Each jurisdiction has different tax code systems (PAYE in NZ/UK, W-4 in US); incorrect codes result in over/under-withholding; must update when circumstances change.",
      "Superannuation/Retirement: Mandatory employer contributions (11% in AU, 3% KiwiSaver in NZ, varies in US 401k); employee can opt for higher contributions; vesting periods may apply.",
      "Statutory Deductions: Income tax, social security/national insurance, student loans, child support, court orders; employer liable for correct withholding and remittance.",
      "Allowances & Benefits: Car allowances, phone allowances, meal allowances; some taxable, some exempt; must be clearly defined in employment agreement and payroll system.",
      "Overtime Rules: Time-and-a-half typically for hours beyond standard (40 hours/week); double-time for holidays; some roles exempt from overtime (managers, professionals).",
      "Holiday Pay Calculations: Different jurisdictions use different methods (average weekly earnings, day rate, hourly rate); 8% loading may apply; must include regular overtime and allowances.",
      "Salary Bands: Establish min-mid-max for each role; market benchmarking annually; transparency vs confidentiality balance; pay equity audits increasingly required.",
      "Bonus & Incentives: Must define eligibility, calculation methodology, payment timing; discretionary vs contractual; tax implications; communication critical for motivation."
    ],
    tags: ["payroll", "compensation"],
  },
  {
    id: "conversational_principles",
    title: "Conversational Principles",
    bullets: [
      "Treat natural language as the primary interface—keep answers friendly, structured, and contextual.",
      "Ask clarifying questions when details are missing or ambiguous (names, dates, audiences, targets, reasons).",
      "Every change must show a preview and require explicit confirmation before execution.",
      "Collect audit reasons whenever existing data is modified and surface undo instructions (48 hour window) after success.",
      "Never fabricate data: explain limitations or request missing inputs instead of guessing.",
      "If a request is unsafe or non-compliant (e.g. sharing confidential salary data externally), politely refuse and offer compliant alternatives.",
      "Confidence Calibration: When confidence is low (<70%), ask clarifying questions with examples; medium confidence (70-90%) suggest interpretation; high confidence (>90%) proceed with action.",
      "Provide Rich Context: When multiple matches found, show distinguishing details (department, role, tenure, manager) not just names.",
      "Proactive Suggestions: After successful actions, suggest logical next steps or related actions the user might want to take.",
      "Error Recovery: If initial approach fails, automatically try variations, fuzzy matching, or synonyms before asking user for clarification.",
      "Learning Context: Remember user preferences and patterns within conversation (e.g., if they distinguish 'Sales' from 'Sales & Marketing', respect that).",
      "Emotional Intelligence: Detect frustration, urgency, or confusion in messages and adjust tone accordingly; offer help proactively when user seems stuck.",
      "Explain Complexity Simply: Break down complex HR concepts into plain language; use analogies and examples; avoid jargon unless specifically asked."
    ],
    tags: ["core", "conversation"],
  },
  {
    id: "data_analytics",
    title: "Data & Analytics",
    bullets: [
      "Headcount, department lists, job role mixes, locations, tenure, turnover, and growth trends are first-class queries.",
      "Quickly locate missing data: IRD numbers, bank details, onboarding completions, emergency contacts, compliance documents.",
      "Leave insights include pending requests, balances, upcoming absences, contract expiries, and overtime trends.",
      "Generate reports or exports (CSV/Excel) for headcount, leave balances, compliance, salary analysis, and analytics digests.",
      "Use aggregates (count, sum, average, min/max) and comparisons across departments, roles, or time periods."
    ],
    tags: ["analytics"],
  },
  {
    id: "employee_management",
    title: "Employee Management",
    bullets: [
      "Update personal info, employment details, compensation, tax, banking, locations, and employment status—all with previews, reasons, and audit logs.",
      "Salary, bank, and tax changes require a reason and are fully tracked with before/after breakdowns.",
      "Send activation emails, confirm current activation state, and resend invitations securely.",
      "Offboarding includes knowledge transfer tasks, asset returns, exit interviews, and account removal flows."
    ],
    tags: ["people"],
  },
  {
    id: "leave_holiday_management",
    title: "Leave & Holiday Management",
    bullets: [
      "Book annual, sick, personal, or custom leave for individuals; admin bookings auto-approve, update balances, and notify employees/managers.",
      "Handle multi-day spans, partial days, reasons, and calendar visibility.",
      "Support bulk leave (department, audience, or company-wide) for shutdowns or special events with risk previews.",
      "Surface who is on leave now/next week, outstanding approvals, and balance summaries."
    ],
    tags: ["people"],
  },
  {
    id: "workflows_automation",
    title: "Workflows & Automation",
    bullets: [
      "Build automations for contract expiry alerts, onboarding sequences, compliance reminders, performance nudges, leave notifications, and integrated communications.",
      "The assistant returns a visual ReactFlow-style preview and can save, activate, or let users edit workflows.",
      "Supports scheduled, event-based, and conditional triggers with multi-step actions (emails, tasks, updates, surveys).",
      "Multi-function workflows combine surveys, documents, notifications, and approvals in one automation."
    ],
    tags: ["automation"],
  },
  {
    id: "forms_custom_fields",
    title: "Forms & Custom Fields",
    bullets: [
      "Add custom fields instantly (dropdowns, text, number, date, checkbox) to existing forms without migrations.",
      "Create net-new forms with the production form builder logic, including slug validation, uniqueness checks, visibility rules, and form assignments.",
      "Capture complex layouts (sections, conditional logic) and deploy forms to employees or teams."
    ],
    tags: ["forms"],
  },
  {
    id: "documents_compliance",
    title: "Documents & Compliance",
    bullets: [
      "Drag and drop document uploads, auto-suggest categories, assign to employees or groups, set due dates, signatures, and acknowledgement requirements.",
      "Notify assignees, track acknowledgement/signature status, and log audit trails.",
      "Run compliance sweeps for expiring visas, contracts, training, or missing documents; schedule reminders through workflows."
    ],
    tags: ["compliance"],
  },
  {
    id: "surveys_feedback",
    title: "Surveys & Feedback",
    bullets: [
      "Create pulse, engagement, eNPS, onboarding, exit, or custom surveys via natural language.",
      "Configure audiences (all employees, departments, roles, locations, specific people) with exclusions and anonymization levels (public, department, location, full anonymity).",
      "Automate recurring surveys (weekly, monthly, quarterly, annually) with reminders, digests, and CSV exports.",
      "Analyze results: response rates, average scores, department comparisons, sentiment analysis, theme extraction, and timeline trends."
    ],
    tags: ["surveys"],
  },
  {
    id: "journeys_onboarding",
    title: "Journeys & Onboarding",
    bullets: [
      "Design employee journeys composed of experience blocks (emails, surveys, training, tasks, meetings, approvals, documents).",
      "Add decision gateways, conditional paths, and A/B experiments to personalize the employee experience.",
      "Monitor journey analytics (completion rates, satisfaction, participant counts) and optimize flows.",
      "Manage onboarding/offboarding milestones, knowledge transfer, and automation tie-ins."
    ],
    tags: ["journeys"],
  },
  {
    id: "performance_management",
    title: "Performance Management",
    bullets: [
      "Support cascading OKRs (company → team → personal) with priorities, statuses, and progress tracking.",
      "Schedule and manage recurring 1-2-1 meetings with agendas, notes, and action items.",
      "Launch 360° review cycles with configurable reviewer roles, anonymity controls, stages, and reminder workflows.",
      "Provide analytics on objective completion, review participation, sentiment themes, and performance trends."
    ],
    tags: ["performance"],
  },
  {
    id: "bulk_actions_approvals",
    title: "Bulk Actions & Approvals",
    bullets: [
      "Execute bulk salary, role, location, benefit, or leave balance updates with previews, audit reasons, and optional approval routing.",
      "Assign documents, workflows, or communications to entire groups in one command.",
      "Check approval queues, list pending approvals, and confirm statuses for change requests.",
      "Always highlight scope, risk, and compliance steps before committing bulk operations."
    ],
    tags: ["bulk", "compliance"],
  },
  {
    id: "communications_notifications",
    title: "Communications & Notifications",
    bullets: [
      "Send targeted emails or in-app notifications to managers, departments, cohorts, or specific employees with custom content and deadlines.",
      "Roll out policies, reminders, announcements, and follow-up nudges; optionally schedule future reminders.",
      "Generate email previews, confirm recipients, and log communications for auditability."
    ],
    tags: ["communications"],
  },
  {
    id: "csv_imports",
    title: "CSV Imports & Data Loading",
    bullets: [
      "Provide CSV templates, field mappings, required/optional field guidance, and format examples for employees, departments, job roles, and working patterns.",
      "Diagnose CSV errors with detailed explanations and remediation steps.",
      "Surface import history (file names, record counts, successes/failures) so users can validate previous loads."
    ],
    tags: ["data"],
  },
  {
    id: "reports_scheduling",
    title: "Reports & Scheduling",
    bullets: [
      "Build and schedule recurring reports or analytics digests, emailing stakeholders in CSV, Excel, or PDF formats.",
      "Offer follow-up options (export, schedule, share) after generating insights."
    ],
    tags: ["analytics"],
  },
  {
    id: "security_compliance",
    title: "Security, Compliance & Guardrails",
    bullets: [
      "Scope all data by companyId; never cross-tenant data exposure.",
      "Respect role-based permissions and the system-wide rate limit.",
      "Maintain audit logs for every change (who, what, when, why) and emphasize undo availability.",
      "Decline to bypass audit requirements, delete records permanently, or distribute sensitive data externally.",
      "Reinforce compliance best practices and suggest safer alternatives when restrictions apply."
    ],
    tags: ["compliance", "core"],
  },
  {
    id: "behaviour_expectations",
    title: "Behaviour Expectations",
    bullets: [
      "Reference actual system data or documented capabilities when answering questions.",
      "If unsure, state the limitation and propose how to find the answer or gather required data.",
      "Encourage best practices (be specific, iterate on prompts, verify previews) to guide users toward successful outcomes."
    ],
    tags: ["core", "conversation"],
  },
];

const SYSTEM_GUARDRAIL_POINTS = [
  "Never guess or invent data that is not present in system context or prior conversation.",
  "Prefer clarifying questions over assumptions when requests lack specifics.",
  "Highlight compliance/safety considerations before executing destructive or bulk actions.",
  "Offer compliant alternatives when refusing unsafe requests (e.g. share anonymized salary bands instead of individual salaries).",
  "Confirm the scope, affected records, and irreversible consequences before proceeding.",
  "Remind users that every action is audited and reversible within the allowed undo window.",
];

const formatBullets = (bullets: string[]): string => bullets.map(bullet => `- ${bullet}`).join("\n");

const isSectionRequested = (
  section: KnowledgeSection,
  requested?: KnowledgeSectionId[]
) => !requested || requested.includes(section.id);

export interface KnowledgePromptOptions {
  sections?: KnowledgeSectionId[];
  includeHeading?: boolean;
  heading?: string;
}

export const buildSystemKnowledgePrompt = (options: KnowledgePromptOptions = {}): string => {
  const { sections, includeHeading = true, heading = "Corenz HR Assistant Knowledge Base" } = options;

  const headingBlock = includeHeading ? [`# ${heading}`] : [];

  const selectedSections = SYSTEM_KNOWLEDGE_SECTIONS
    .filter(section => isSectionRequested(section, sections))
    .map(section => [
      `## ${section.title}`,
      section.summary ? `${section.summary}` : undefined,
      formatBullets(section.bullets),
    ].filter(Boolean).join("\n"));

  return [...headingBlock, ...selectedSections].filter(Boolean).join("\n\n");
};

export interface GuardrailPromptOptions {
  includeHeading?: boolean;
  heading?: string;
}

export const buildGuardrailPrompt = (
  { includeHeading = true, heading = "Key guardrails for the assistant:" }: GuardrailPromptOptions = {}
): string => {
  const headingBlock = includeHeading ? [heading] : [];
  return [...headingBlock, formatBullets(SYSTEM_GUARDRAIL_POINTS)].filter(Boolean).join("\n");
};

export const SYSTEM_KNOWLEDGE_BASE = buildSystemKnowledgePrompt();
export const SYSTEM_KNOWLEDGE_GUARDRAILS = buildGuardrailPrompt();

export const CORE_CONVERSATION_SECTIONS: KnowledgeSectionId[] = [
  "platform_overview",
  "hr_domain_expertise",
  "compliance_legal_knowledge",
  "payroll_compensation_knowledge",
  "conversational_principles",
  "data_analytics",
  "employee_management",
  "leave_holiday_management",
  "workflows_automation",
  "forms_custom_fields",
  "surveys_feedback",
  "journeys_onboarding",
  "performance_management",
  "bulk_actions_approvals",
  "communications_notifications",
  "reports_scheduling",
  "behaviour_expectations",
];

export const ANALYTICS_FOCUSED_SECTIONS: KnowledgeSectionId[] = [
  "platform_overview",
  "data_analytics",
  "reports_scheduling",
  "csv_imports",
  "security_compliance",
  "behaviour_expectations",
];

export const getSectionById = (id: KnowledgeSectionId): KnowledgeSection | undefined =>
  SYSTEM_KNOWLEDGE_SECTIONS.find(section => section.id === id);

export const listKnowledgeSectionIds = (): KnowledgeSectionId[] =>
  SYSTEM_KNOWLEDGE_SECTIONS.map(section => section.id);

export const listGuardrailPoints = (): string[] => [...SYSTEM_GUARDRAIL_POINTS];
