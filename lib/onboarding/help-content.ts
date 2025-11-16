/**
 * Contextual Help Content System
 * Provides help overlays, video tutorials, and documentation links
 * for the onboarding builder
 */

export type TenantSegment = "nz" | "au" | "global";

export interface HelpArticleLink {
  title: string;
  url: string;
  openInNewTab?: boolean;
}

export interface HelpContent {
  id: string;
  stepType?: string;
  title: string;
  description: string;
  videoUrl?: string;
  videoThumbnail?: string;
  articleLinks?: HelpArticleLink[];
  segment?: TenantSegment;
  tags?: string[];
  relatedTopics?: string[];
}

/**
 * NZ-Specific Onboarding Help Content
 */
export const NZ_HELP_CONTENT: HelpContent[] = [
  {
    id: "nz-onboarding-overview",
    title: "New Zealand Onboarding Compliance",
    description:
      "Understanding NZ-specific employment requirements including employment agreements, tax codes (IRD numbers), and KiwiSaver enrollment obligations under the Employment Relations Act 2000.",
    segment: "nz",
    tags: ["compliance", "employment-law", "nz"],
    articleLinks: [
      {
        title: "Employment Standards Act Guide",
        url: "/docs/nz/employment-standards",
        openInNewTab: true,
      },
      {
        title: "KiwiSaver Setup for Employers",
        url: "/docs/nz/kiwisaver-setup",
        openInNewTab: true,
      },
      {
        title: "IRD Number Collection Requirements",
        url: "/docs/nz/ird-requirements",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["payroll-setup", "compliance-training", "document-upload"],
  },
  {
    id: "nz-health-safety",
    stepType: "compliance-training",
    title: "Health & Safety Induction (NZ)",
    description:
      "New Zealand's Health and Safety at Work Act 2015 requires employers to ensure workers are adequately trained. This includes site-specific inductions for construction, manufacturing, and high-risk industries.",
    segment: "nz",
    tags: ["health-safety", "compliance", "training"],
    articleLinks: [
      {
        title: "HSWA 2015 Overview",
        url: "/docs/nz/health-safety-act",
        openInNewTab: true,
      },
      {
        title: "Industry-Specific Requirements",
        url: "/docs/nz/industry-safety",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["compliance-training", "document-upload"],
  },
  {
    id: "nz-kiwisaver-enrollment",
    stepType: "payroll-setup",
    title: "KiwiSaver Auto-Enrollment",
    description:
      "Employers must automatically enroll eligible employees in KiwiSaver unless they opt out within the first 2-8 weeks. Default contribution rates are 3% employee and 3% employer minimum.",
    segment: "nz",
    tags: ["kiwisaver", "payroll", "compliance"],
    articleLinks: [
      {
        title: "KiwiSaver Employer Guide",
        url: "/docs/nz/kiwisaver-employer",
        openInNewTab: true,
      },
      {
        title: "Contribution Rate Calculator",
        url: "/docs/nz/kiwisaver-calculator",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["payroll-setup", "benefits-enrollment"],
  },
  {
    id: "nz-employment-agreement",
    stepType: "document-upload",
    title: "Employment Agreement Requirements",
    description:
      "All NZ employees must have a written individual or collective employment agreement before starting work. The agreement must include minimum legal requirements and be signed by both parties.",
    segment: "nz",
    tags: ["employment-agreement", "compliance", "documents"],
    articleLinks: [
      {
        title: "Employment Agreement Template",
        url: "/docs/nz/agreement-template",
        openInNewTab: true,
      },
      {
        title: "Minimum Employment Rights",
        url: "/docs/nz/minimum-rights",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["document-upload", "document-review"],
  },
  {
    id: "nz-probation-period",
    stepType: "probation-goals",
    title: "Trial & Probation Periods (NZ)",
    description:
      "NZ law distinguishes between trial periods (up to 90 days for businesses with fewer than 20 employees) and probation periods. Understanding the legal differences is critical for compliance.",
    segment: "nz",
    tags: ["probation", "trial-period", "employment-law"],
    articleLinks: [
      {
        title: "Trial Period Rules",
        url: "/docs/nz/trial-periods",
        openInNewTab: true,
      },
      {
        title: "Setting Probation Goals",
        url: "/docs/nz/probation-best-practice",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["probation-goals", "manager-checkin"],
  },
];

/**
 * General (Global) Help Content
 */
export const GLOBAL_HELP_CONTENT: HelpContent[] = [
  {
    id: "getting-started",
    title: "Getting Started with Onboarding Builder",
    description:
      "Learn how to create effective onboarding journeys using the template editor. This guide covers step types, metadata configuration, and publishing workflows.",
    segment: "global",
    tags: ["getting-started", "basics"],
    articleLinks: [
      {
        title: "Quick Start Guide",
        url: "/docs/onboarding/quick-start",
        openInNewTab: true,
      },
      {
        title: "Step Types Reference",
        url: "/docs/onboarding/step-types",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["journey-automation", "preset-library"],
  },
  {
    id: "journey-automation",
    stepType: "journey-automation",
    title: "Journey Automation",
    description:
      "Trigger automated workflows at specific points in the onboarding process. Journey automations can handle complex scenarios like conditional task assignment and escalations.",
    segment: "global",
    tags: ["automation", "workflows"],
    articleLinks: [
      {
        title: "Journey Automation Guide",
        url: "/docs/automation/journeys",
        openInNewTab: true,
      },
      {
        title: "Trigger Conditions",
        url: "/docs/automation/triggers",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["journey-automation"],
  },
  {
    id: "document-collection",
    stepType: "document-upload",
    title: "Document Collection Best Practices",
    description:
      "Streamline document collection by clearly defining requirements, setting due dates, and automating reminders. Support multiple file types and provide upload validation.",
    segment: "global",
    tags: ["documents", "compliance", "best-practice"],
    articleLinks: [
      {
        title: "Document Types Guide",
        url: "/docs/documents/types",
        openInNewTab: true,
      },
      {
        title: "Validation Rules",
        url: "/docs/documents/validation",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["document-upload", "document-review"],
  },
  {
    id: "manager-check-ins",
    stepType: "manager-checkin",
    title: "Structured Manager Check-ins",
    description:
      "Schedule regular touchpoints between new hires and their managers. Use templates to ensure consistency and track completion rates to identify at-risk employees early.",
    segment: "global",
    tags: ["management", "probation", "retention"],
    articleLinks: [
      {
        title: "Check-in Templates",
        url: "/docs/management/checkin-templates",
        openInNewTab: true,
      },
      {
        title: "Retention Metrics",
        url: "/docs/analytics/retention",
        openInNewTab: true,
      },
    ],
    relatedTopics: ["manager-checkin", "probation-goals"],
  },
];

/**
 * Combine all help content
 */
export const ALL_HELP_CONTENT: HelpContent[] = [
  ...NZ_HELP_CONTENT,
  ...GLOBAL_HELP_CONTENT,
];

/**
 * Get help content by ID
 */
export function getHelpContent(id: string): HelpContent | undefined {
  return ALL_HELP_CONTENT.find((content) => content.id === id);
}

/**
 * Get help content for a specific step type
 */
export function getHelpForStepType(
  stepType: string,
  segment?: TenantSegment,
): HelpContent[] {
  return ALL_HELP_CONTENT.filter((content) => {
    const matchesStepType = content.stepType === stepType;
    const matchesSegment = !segment || !content.segment || content.segment === segment || content.segment === "global";
    return matchesStepType && matchesSegment;
  });
}

/**
 * Search help content by query
 */
export function searchHelpContent(
  query: string,
  segment?: TenantSegment,
): HelpContent[] {
  const lowerQuery = query.toLowerCase();
  return ALL_HELP_CONTENT.filter((content) => {
    const matchesSegment =
      !segment ||
      !content.segment ||
      content.segment === segment ||
      content.segment === "global";

    const matchesQuery =
      content.title.toLowerCase().includes(lowerQuery) ||
      content.description.toLowerCase().includes(lowerQuery) ||
      content.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery));

    return matchesSegment && matchesQuery;
  });
}

/**
 * Get related help topics
 */
export function getRelatedHelp(contentId: string): HelpContent[] {
  const content = getHelpContent(contentId);
  if (!content || !content.relatedTopics) return [];

  return content.relatedTopics
    .map((topicId) => getHelpContent(topicId))
    .filter((topic): topic is HelpContent => topic !== undefined);
}

/**
 * Get help content by tags
 */
export function getHelpByTags(tags: string[], segment?: TenantSegment): HelpContent[] {
  return ALL_HELP_CONTENT.filter((content) => {
    const matchesSegment =
      !segment ||
      !content.segment ||
      content.segment === segment ||
      content.segment === "global";

    const matchesTags = tags.some((tag) =>
      content.tags?.some((contentTag) =>
        contentTag.toLowerCase().includes(tag.toLowerCase()),
      ),
    );

    return matchesSegment && matchesTags;
  });
}
