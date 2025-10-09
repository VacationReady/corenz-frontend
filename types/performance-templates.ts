// Performance Template Types
export type TemplateType = 
  | "ONE_TO_ONE"
  | "PROBATION_REVIEW"
  | "QUARTERLY_REVIEW"
  | "ANNUAL_REVIEW"
  | "MID_YEAR_REVIEW"
  | "PROJECT_RETROSPECTIVE"
  | "REVIEW_CYCLE"
  | "THREE_SIXTY"
  | "CUSTOM";

export type ReviewerRole = 
  | "SELF"
  | "MANAGER"
  | "PEER"
  | "DIRECT_REPORT"
  | "SKIP_LEVEL"
  | "HR";

export interface AudienceFilters {
  locations?: string[];
  departments?: string[];
  jobRoles?: string[];
}

export interface ReviewerAssignment {
  role: ReviewerRole;
  dueOffsetDays?: number;
  isRequired?: boolean;
  minReviewers?: number;
  maxReviewers?: number;
}

export interface PerformanceTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  type: TemplateType;
  icon?: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  tags: string[];
  visibility: "PRIVATE" | "TEAM" | "DEPARTMENT" | "COMPANY";
  audienceFilters?: AudienceFilters;
  reviewerAssignments?: ReviewerAssignment[];
  bestPracticePackIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sections?: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  order: number;
  isRequired: boolean;
  questions: TemplateQuestion[];
}

export interface TemplateQuestion {
  id: string;
  sectionId: string;
  question: string;
  description?: string;
  type: QuestionType;
  order: number;
  isRequired: boolean;
  options?: any;
  // Question-level permissions
  visibleToRoles?: ReviewerRole[];
  requiredFromRoles?: ReviewerRole[];
  hideFromEmployee?: boolean;
}

export type QuestionType = 
  | "TEXT"
  | "TEXTAREA"
  | "RATING"
  | "MULTIPLE_CHOICE"
  | "YES_NO"
  | "DATE"
  | "NUMBER";

export interface BestPracticePack {
  id: string;
  name: string;
  description: string;
  templateTypes: TemplateType[];
  sections: Omit<TemplateSection, "id" | "templateId">[];
  icon?: string;
  tags: string[];
}

// Wizard state
export interface TemplateWizardState {
  step: number;
  type?: TemplateType;
  name: string;
  description: string;
  audienceFilters: AudienceFilters;
  reviewerAssignments: ReviewerAssignment[];
  bestPracticePackIds: string[];
  sections: {
    title: string;
    description?: string;
    order: number;
    isRequired: boolean;
    questions: Omit<TemplateQuestion, "id" | "sectionId">[];
  }[];
  icon?: string;
  tags: string[];
}

export const TEMPLATE_TYPE_INFO: Record<TemplateType, {
  label: string;
  description: string;
  icon: string;
  whenToUse: string;
  defaultReviewers?: ReviewerRole[];
}> = {
  ONE_TO_ONE: {
    label: "1-2-1 Meeting",
    description: "Regular check-ins between manager and direct report",
    icon: "MessageSquare",
    whenToUse: "Weekly or bi-weekly conversations to discuss progress, blockers, and development",
    defaultReviewers: ["SELF", "MANAGER"],
  },
  PROBATION_REVIEW: {
    label: "Probation Review",
    description: "End-of-probation assessment for new hires",
    icon: "UserCheck",
    whenToUse: "At the end of probation period (typically 3-6 months) to confirm permanent employment",
    defaultReviewers: ["SELF", "MANAGER", "HR"],
  },
  QUARTERLY_REVIEW: {
    label: "Quarterly Review",
    description: "Performance check-in every quarter",
    icon: "Calendar",
    whenToUse: "Regular quarterly assessments to track progress against objectives",
    defaultReviewers: ["SELF", "MANAGER"],
  },
  ANNUAL_REVIEW: {
    label: "Annual Review",
    description: "Comprehensive yearly performance evaluation",
    icon: "Award",
    whenToUse: "End-of-year formal review for compensation, promotion, and development planning",
    defaultReviewers: ["SELF", "MANAGER", "SKIP_LEVEL"],
  },
  MID_YEAR_REVIEW: {
    label: "Mid-Year Review",
    description: "Half-year progress check and goal adjustment",
    icon: "Target",
    whenToUse: "Midpoint review to assess progress and adjust goals for the second half",
    defaultReviewers: ["SELF", "MANAGER"],
  },
  PROJECT_RETROSPECTIVE: {
    label: "Project Retrospective",
    description: "Post-project reflection and lessons learned",
    icon: "GitBranch",
    whenToUse: "After completing major projects to capture learnings and celebrate wins",
    defaultReviewers: ["SELF", "MANAGER", "PEER"],
  },
  REVIEW_CYCLE: {
    label: "Review Cycle",
    description: "Cadence-based performance review program",
    icon: "RefreshCw",
    whenToUse: "Structured review programs running quarterly, semi-annually, or annually",
    defaultReviewers: ["SELF", "MANAGER"],
  },
  THREE_SIXTY: {
    label: "360° Review",
    description: "Multi-rater feedback from all directions",
    icon: "Layers",
    whenToUse: "Comprehensive feedback from managers, peers, direct reports, and self for leadership development",
    defaultReviewers: ["SELF", "MANAGER", "PEER", "DIRECT_REPORT", "SKIP_LEVEL"],
  },
  CUSTOM: {
    label: "Custom Template",
    description: "Build your own template from scratch",
    icon: "Settings",
    whenToUse: "When standard templates don't fit your specific needs",
  },
};

export const REVIEWER_ROLE_INFO: Record<ReviewerRole, {
  label: string;
  description: string;
  icon: string;
  tipTitle: string;
  tipContent: string;
}> = {
  SELF: {
    label: "Self Review",
    description: "Employee reflects on their own performance",
    icon: "User",
    tipTitle: "Why self reviews?",
    tipContent: "Self-reflection promotes ownership and helps employees prepare for constructive conversations with their manager.",
  },
  MANAGER: {
    label: "Manager Review",
    description: "Direct manager provides feedback",
    icon: "UserCheck",
    tipTitle: "Manager feedback",
    tipContent: "Managers have the most context on day-to-day performance and can provide specific, actionable feedback.",
  },
  PEER: {
    label: "Peer Review",
    description: "Colleagues at the same level provide feedback",
    icon: "Users",
    tipTitle: "Peer perspectives",
    tipContent: "Peers see collaboration, communication, and teamwork that managers might miss. Valuable for 360° feedback.",
  },
  DIRECT_REPORT: {
    label: "Upward Review",
    description: "Direct reports review their manager",
    icon: "ArrowUp",
    tipTitle: "Upward feedback",
    tipContent: "Direct reports provide unique insights into leadership effectiveness, communication, and support.",
  },
  SKIP_LEVEL: {
    label: "Skip-Level Review",
    description: "Manager's manager provides feedback",
    icon: "TrendingUp",
    tipTitle: "Executive perspective",
    tipContent: "Skip-level reviews ensure alignment with organizational goals and provide senior leadership perspective.",
  },
  HR: {
    label: "HR Review",
    description: "Human Resources team input",
    icon: "Building",
    tipTitle: "HR involvement",
    tipContent: "HR ensures consistency, fairness, and compliance while providing an objective third-party perspective.",
  },
};
