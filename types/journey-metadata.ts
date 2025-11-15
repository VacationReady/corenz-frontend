export type TemplateSummary = {
  id: string;
  journeyId: string;
  name: string;
  status: "Draft" | "Published" | "Archived" | "Deprecated";
  updatedAt: string;
  updatedBy: string | null;
  steps: number;
  mandatorySteps: number;
  optionalSteps: number;
  complianceAlerts: number;
};

export type ChecklistStep = {
  id: string;
  phaseId: string;
  phase: string;
  name: string;
  mandatory: boolean;
  owner: string;
  duration: string;
  complianceReference?: string;
  helperText?: string;
  status: "Draft" | "Published";
  lastVerified?: string;
  tags: string[];
  nzAlert?: string;
};

export type Milestone = {
  id: string;
  phase: string;
  title: string;
  dayOffset: number;
  helperText?: string;
  complianceAlert?: string;
  type: string;
};

export type DocumentSetting = {
  id: string;
  name: string;
  category: string | null;
  mandatory: boolean;
  requiresSignature: boolean;
  requiresAcknowledgement: boolean;
  helper?: string | null;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  actor: string;
  timestamp: string;
  action: string;
  details: string;
};

export type ComplianceAlert = {
  id: string;
  severity: "High" | "Medium";
  summary: string;
  detail: string;
  relatedTab: "Checklist" | "Timeline" | "Documents";
};

export type PublishingChecklistItem = {
  id: string;
  label: string;
  status: "Pass" | "Warning" | "Fail";
};

export type PersonaPreview = {
  id: string;
  label: string;
  description: string;
};

export type JourneyMetadataDetail = {
  template: TemplateSummary & {
    description?: string | null;
    persona?: string | null;
    publishedAt?: string | null;
  };
  checklist: ChecklistStep[];
  timeline: {
    milestones: Milestone[];
    timezone: string;
    holidayRegion: string | null;
  };
  documents: {
    items: DocumentSetting[];
    retentionYears: number;
    storageLocation: string | null;
    encryption: string | null;
    approverRoles: string[];
    notifyPortal: boolean;
  };
  auditTrail: {
    events: AuditEvent[];
    alerts: ComplianceAlert[];
  };
  publishing: {
    reviewTotals: {
      stepsConfigured: number;
      totalSteps: number;
      milestones: number;
      documentsPresent: number;
      mandatoryDocuments: number;
    };
    complianceChecklist: PublishingChecklistItem[];
    personaPreviews: PersonaPreview[];
    canSchedule: boolean;
    timezone: string;
    hasHolidayConflicts: boolean;
  };
  journeyIdSuggestions: string[];
};

export type JourneyMetadataResponse = {
  templates: TemplateSummary[];
  detail: JourneyMetadataDetail | null;
};
