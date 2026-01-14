import { JourneyStatus, Prisma } from "@prisma/client";
import type {
  JourneyTemplate,
  JourneyPhase,
  ExperienceBlock,
  JourneyVersion,
  Document,
} from "@prisma/client";
import slugify from "slugify";
import type {
  TemplateSummary,
  ChecklistStep,
  Milestone,
  DocumentSetting,
  AuditEvent,
  ComplianceAlert,
  PublishingChecklistItem,
  PersonaPreview,
  JourneyMetadataDetail,
  JourneyMetadataResponse,
} from "@/types/journey-metadata";

type JsonValue = Prisma.JsonValue;

export const JOURNEY_ID_REGEX = /^[A-Z0-9-]{3,30}$/;
const RESERVED_PREFIXES = ["IRD-", "ACC-", "OSHA-"] as const;

type ExperienceBlockWithMeta = ExperienceBlock & {
  automationConfig: JsonValue | null;
  assets: JsonValue | null;
  successCriteria: JsonValue | null;
};

type JourneyPhaseWithBlocks = JourneyPhase & {
  experienceBlocks: ExperienceBlockWithMeta[];
};

type JourneyVersionWithCreator = JourneyVersion & {
  creator: { id: string; name: string | null; email: string | null } | null;
};

type JourneyTemplateWithRelations = JourneyTemplate & {
  phases: JourneyPhaseWithBlocks[];
  versions: JourneyVersionWithCreator[];
  Creator: { id: string; name: string | null; email: string | null } | null;
  LastModifier: { id: string; name: string | null; email: string | null } | null;
};

type DocumentSummary = Pick<
  Document,
  | "id"
  | "name"
  | "category"
  | "requiresAck"
  | "requireAckFromNewStarters"
  | "requiresSignature"
  | "description"
  | "createdAt"
  | "path"
  | "url"
>;

const STATUS_MAP: Record<JourneyStatus, TemplateSummary["status"]> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  DEPRECATED: "Deprecated",
};

function asRecord(value: JsonValue | null): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, any>;
}

function gatherBlocks(phases: JourneyPhaseWithBlocks[]) {
  const ordered = [...phases].sort((a, b) => a.order - b.order);
  return ordered.flatMap((phase) =>
    [...phase.experienceBlocks]
      .sort((a, b) => a.order - b.order)
      .map((block) => ({ block, phase })),
  );
}

function estimateDuration(hours?: number | null): string {
  if (!hours || hours <= 0) return "—";
  if (hours % 24 === 0) {
    return `${hours / 24}d`;
  }
  if (hours >= 24) {
    const days = hours / 24;
    return `${Math.round(days * 10) / 10}d`;
  }
  return `${Math.round(hours)}h`;
}

function extractJourneyId(tags: string[] | null | undefined, fallback: string) {
  if (Array.isArray(tags)) {
    const candidate = tags.find((tag) => JOURNEY_ID_REGEX.test(tag.toUpperCase()));
    if (candidate) {
      return candidate.toUpperCase();
    }
  }
  return fallback.toUpperCase().slice(0, 30);
}

function formatUser(user: { name: string | null; email: string | null } | null | undefined) {
  if (!user) return null;
  return user.name || user.email || null;
}

function flattenStrings(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenStrings(entry));
  }
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, any>).flatMap((entry) => flattenStrings(entry));
  }
  return [];
}

function collectDocumentIds(block: ExperienceBlockWithMeta): string[] {
  const assets = block.assets;
  const rawIds = flattenStrings(assets);
  const docIds = rawIds.filter((value) => typeof value === "string" && value.length >= 8);
  return docIds;
}

function deriveStorageLocation(documents: DocumentSummary[]): string | null {
  for (const doc of documents) {
    const path = doc.path || doc.url;
    if (!path) continue;
    const match = /([a-z]{2}-[a-z]+-\d)/i.exec(path);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  return null;
}

function deriveEncryption(documents: DocumentSummary[]): string | null {
  for (const doc of documents) {
    if (doc.path?.toLowerCase().includes("kms") || doc.url?.toLowerCase().includes("kms")) {
      return "AWS KMS-managed";
    }
  }
  return documents.length ? "Managed" : null;
}

function computeComplianceAlerts(
  blocks: ReturnType<typeof gatherBlocks>,
  documentsById: Map<string, DocumentSummary>,
): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];

  blocks.forEach(({ block, phase }) => {
    const docIds = collectDocumentIds(block);
    if (block.blockType === "DOCUMENT") {
      const matchedDocs = docIds.filter((id) => documentsById.has(id));
      if (!matchedDocs.length) {
        alerts.push({
          id: `${block.id}-missing-document`,
          severity: "High",
          summary: `Document missing for ${block.name}`,
          detail: `The document block "${block.name}" in phase "${phase.name}" does not reference a stored document. Upload a document or link an existing template before publishing.`,
          relatedTab: "Documents",
        });
      }
    }

    if (block.blockType === "TRAINING") {
      const assets = asRecord(block.assets);
      const modules = Array.isArray(assets?.modules) ? assets?.modules : [];
      if (!modules.length) {
        alerts.push({
          id: `${block.id}-missing-modules`,
          severity: "Medium",
          summary: `Training modules missing in ${block.name}`,
          detail: `The training block "${block.name}" does not list any modules. Add module metadata so NZ compliance reviews can confirm coverage.`,
          relatedTab: "Checklist",
        });
      }
    }

    if (block.blockType === "MILESTONE" && block.estimatedDuration == null) {
      alerts.push({
        id: `${block.id}-missing-duration`,
        severity: "Medium",
        summary: `Milestone duration not set for ${block.name}`,
        detail: `Set an estimated duration for milestone "${block.name}" so downstream scheduling aligns with Holidays Act requirements.`,
        relatedTab: "Timeline",
      });
    }
  });

  return alerts;
}

function formatChanges(changes: JsonValue): string {
  if (typeof changes === "string") {
    return changes;
  }
  if (Array.isArray(changes)) {
    const entries = changes
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const summary = (entry as any).summary || (entry as any).description;
          if (summary) return summary;
          return JSON.stringify(entry);
        }
        return String(entry);
      })
      .filter(Boolean);
    return entries.join("; ") || "Snapshot captured";
  }
  if (changes && typeof changes === "object") {
    const summary = (changes as any).summary || (changes as any).description;
    if (summary) return String(summary);
    return JSON.stringify(changes);
  }
  return "Snapshot captured";
}

function computeDayOffsets(phases: JourneyPhaseWithBlocks[]) {
  const offsets = new Map<string, number>();
  let cumulative = 0;

  const orderedPhases = [...phases].sort((a, b) => a.order - b.order);
  orderedPhases.forEach((phase) => {
    let phaseCursor = 0;
    const phaseBlocks = [...phase.experienceBlocks].sort((a, b) => a.order - b.order);

    phaseBlocks.forEach((block) => {
      const dayOffset = Math.round(cumulative + phaseCursor);
      offsets.set(block.id, dayOffset);
      const increment = block.estimatedDuration ? block.estimatedDuration / 24 : 0;
      phaseCursor += increment;
    });

    const phaseDuration = phase.duration ?? phaseCursor;
    cumulative += Math.max(phaseDuration, phaseCursor);
  });

  return offsets;
}

function buildChecklist(
  blocks: ReturnType<typeof gatherBlocks>,
  template: JourneyTemplateWithRelations,
): ChecklistStep[] {
  const published = template.status === "PUBLISHED";
  const lastVerified = published && template.publishedAt ? template.publishedAt.toISOString() : undefined;
  return blocks.map(({ block, phase }) => {
    const assets = asRecord(block.assets) || {};
    const compliance = assets.complianceReference || assets.reference || assets.compliance;
    const tags = new Set<string>();
    tags.add(block.blockType.toLowerCase());
    flattenStrings(assets.tags).forEach((tag) => tags.add(tag));
    const docIds = collectDocumentIds(block);
    if (docIds.length) {
      tags.add("document-linked");
    }
    return {
      id: block.id,
      phaseId: phase.id,
      phase: phase.name,
      name: block.name,
      mandatory: block.isRequired !== false,
      owner: block.responsibleRole || "Unassigned",
      duration: estimateDuration(block.estimatedDuration),
      complianceReference:
        typeof compliance === "string"
          ? compliance
          : Array.isArray(compliance)
            ? compliance.filter((entry: any) => typeof entry === "string").join(", ")
            : undefined,
      helperText: block.description || undefined,
      status: published ? "Published" : "Draft",
      lastVerified,
      tags: Array.from(tags),
      nzAlert:
        block.blockType === "DOCUMENT" && !docIds.length
          ? "Add a document so acknowledgements are retained for NZ Privacy Act audits."
          : undefined,
    };
  });
}

function buildTimeline(
  blocks: ReturnType<typeof gatherBlocks>,
  offsets: Map<string, number>,
): Milestone[] {
  return blocks
    .filter(({ block }) => ["MILESTONE", "MEETING", "TASK", "TRAINING"].includes(block.blockType))
    .map(({ block, phase }) => ({
      id: block.id,
      phase: phase.name,
      title: block.name,
      dayOffset: offsets.get(block.id) ?? 0,
      helperText: block.description || undefined,
      complianceAlert:
        block.blockType === "TASK" && block.isRequired === false
          ? "Mark optional tasks clearly so compliance exports remain accurate."
          : undefined,
      type: block.blockType,
    }));
}

function buildDocumentSettings(
  documentIds: Set<string>,
  documents: DocumentSummary[],
): { items: DocumentSetting[]; mandatory: number; storageLocation: string | null; encryption: string | null } {
  const byId = new Map(documents.map((doc) => [doc.id, doc] as const));
  const items: DocumentSetting[] = [];

  documentIds.forEach((id) => {
    const doc = byId.get(id);
    if (doc) {
      items.push({
        id: doc.id,
        name: doc.name,
        category: doc.category ?? null,
        mandatory: doc.requiresAck || doc.requiresSignature,
        requiresSignature: doc.requiresSignature,
        requiresAcknowledgement: doc.requiresAck,
        helper: doc.description,
        createdAt: doc.createdAt.toISOString(),
      });
    }
  });

  if (!items.length) {
    documents.slice(0, 5).forEach((doc) => {
      items.push({
        id: doc.id,
        name: doc.name,
        category: doc.category ?? null,
        mandatory: doc.requiresAck || doc.requiresSignature,
        requiresSignature: doc.requiresSignature,
        requiresAcknowledgement: doc.requiresAck,
        helper: doc.description,
        createdAt: doc.createdAt.toISOString(),
      });
    });
  }

  const mandatory = items.filter((item) => item.mandatory).length;
  const storageLocation = deriveStorageLocation(documents);
  const encryption = deriveEncryption(documents);

  return { items, mandatory, storageLocation, encryption };
}

function buildAuditEvents(versions: JourneyVersionWithCreator[]): AuditEvent[] {
  return [...versions]
    .sort((a, b) => b.version - a.version)
    .map((version) => ({
      id: version.id,
      actor: formatUser(version.creator) || "Unknown user",
      timestamp: version.createdAt.toISOString(),
      action: version.version === 1 ? "Created" : `Version ${version.version}`,
      details: formatChanges(version.changes),
    }));
}

function generateJourneyIdSuggestions(template: JourneyTemplateWithRelations): string[] {
  const baseName = template.name || "Journey";
  const personaSlug = template.persona
    ? slugify(template.persona, { strict: true }).toUpperCase() || "NZ"
    : "NZ";
  const categorySlug = template.category
    ? slugify(template.category, { strict: true }).toUpperCase() || "ONB"
    : "ONB";
  const nameSlugSource = slugify(baseName, { strict: true });
  const nameSlugBase = nameSlugSource
    ? nameSlugSource.toUpperCase()
    : template.id.slice(0, 6).toUpperCase();
  const nameSlug = nameSlugBase.slice(0, 6);
  const versionCode = String(template.version || 1).padStart(2, "0");

  const candidates = [
    `${categorySlug}-${personaSlug}-${versionCode}`,
    `${categorySlug}-${nameSlug}-${template.updatedAt.getFullYear()}`,
    `${categorySlug}-${personaSlug}-${template.id.slice(0, 4).toUpperCase()}`,
  ];

  return candidates
    .map((candidate) => candidate.replace(/--+/g, "-").replace(/^-|-$/g, ""))
    .map((candidate) => candidate.slice(0, 30))
    .filter((candidate, index, array) => candidate && array.indexOf(candidate) === index);
}

export function buildMetadataResponse(
  templates: JourneyTemplateWithRelations[],
  documents: DocumentSummary[],
  options: {
    selectedTemplateId?: string;
    retentionYears?: number;
    holidayRegion?: string | null;
    timezone?: string;
  } = {},
): JourneyMetadataResponse {
  const documentsById = new Map(documents.map((doc) => [doc.id, doc] as const));

  const summaries: TemplateSummary[] = templates.map((template) => {
    const blocks = gatherBlocks(template.phases);
    const mandatorySteps = blocks.filter(({ block }) => block.isRequired !== false).length;
    const optionalSteps = blocks.length - mandatorySteps;
    const journeyId = extractJourneyId(template.tags, template.id);
    const alerts = computeComplianceAlerts(blocks, documentsById);

    return {
      id: template.id,
      journeyId,
      name: template.name,
      status: STATUS_MAP[template.status],
      updatedAt: template.updatedAt.toISOString(),
      updatedBy: formatUser(template.LastModifier || template.Creator),
      steps: blocks.length,
      mandatorySteps,
      optionalSteps,
      complianceAlerts: alerts.length,
    };
  });

  const selectedId = options.selectedTemplateId || summaries[0]?.id;
  const selectedTemplate = templates.find((template) => template.id === selectedId) || null;

  if (!selectedTemplate) {
    return { templates: summaries, detail: null };
  }

  const blocks = gatherBlocks(selectedTemplate.phases);
  const offsets = computeDayOffsets(selectedTemplate.phases);

  const checklist = buildChecklist(blocks, selectedTemplate);
  const timeline = buildTimeline(blocks, offsets);
  const documentIds = new Set<string>();
  blocks.forEach(({ block }) => collectDocumentIds(block).forEach((id) => documentIds.add(id)));
  const { items: documentItems, mandatory: mandatoryDocuments, storageLocation, encryption } =
    buildDocumentSettings(documentIds, documents);
  const alerts = computeComplianceAlerts(blocks, documentsById);
  const auditEvents = buildAuditEvents(selectedTemplate.versions);

  const totalSteps = blocks.length;
  const milestones = timeline.length;
  const documentsPresent = documentItems.length;

  const complianceChecklist: PublishingChecklistItem[] = [
    {
      id: "privacy-act",
      label: "Privacy Act consent",
      status: documentItems.some((item) => item.requiresAcknowledgement) ? "Pass" : "Warning",
    },
    {
      id: "health-safety",
      label: "Health & Safety induction",
      status: checklist.some((step) => /safety/i.test(step.name)) ? "Pass" : "Warning",
    },
    {
      id: "ird-tax",
      label: "IRD tax documentation",
      status: checklist.some((step) => /ird|tax/i.test(step.name)) ? "Pass" : "Warning",
    },
    {
      id: "holidays-act",
      label: "Holidays Act leave recording",
      status: timeline.some((milestone) => /leave|holiday/i.test(milestone.title)) ? "Pass" : "Warning",
    },
  ];

  const personaPreviews: PersonaPreview[] = [];
  const personaLabel = selectedTemplate.persona || "Employee";
  personaPreviews.push({
    id: "employee",
    label: personaLabel,
    description: `Journey preview tailored for the ${personaLabel.toLowerCase()} experience with ${totalSteps} configured steps.`,
  });
  if (checklist.some((step) => /manager/i.test(step.owner))) {
    personaPreviews.push({
      id: "manager",
      label: "Manager",
      description: "Highlights tasks routed to managers, including approvals and check-ins.",
    });
  }
  if (documentItems.some((item) => item.requiresSignature)) {
    personaPreviews.push({
      id: "compliance",
      label: "Compliance",
      description: "Surfaces signature-required documents and audit export readiness.",
    });
  }

  const summaryEntry = summaries.find((summary) => summary.id === selectedTemplate.id)!;
  const detail: JourneyMetadataDetail = {
    template: {
      ...summaryEntry,
      description: selectedTemplate.description,
      persona: selectedTemplate.persona,
      publishedAt: selectedTemplate.publishedAt?.toISOString() ?? null,
    },
    checklist,
    timeline: {
      milestones: timeline,
      timezone: options.timezone || "Pacific/Auckland",
      holidayRegion: options.holidayRegion ?? null,
    },
    documents: {
      items: documentItems,
      retentionYears: options.retentionYears ?? 7,
      storageLocation,
      encryption,
      approverRoles: Array.from(
        new Set(
          checklist
            .filter((step) => /approval|sign/i.test(step.name) || /approval/i.test(step.owner))
            .map((step) => step.owner),
        ),
      ),
      notifyPortal: checklist.some((step) => /notify|communication|email/i.test(step.name)),
    },
    auditTrail: {
      events: auditEvents,
      alerts,
    },
    publishing: {
      reviewTotals: {
        stepsConfigured: totalSteps,
        totalSteps,
        milestones,
        documentsPresent,
        mandatoryDocuments,
      },
      complianceChecklist,
      personaPreviews,
      canSchedule: selectedTemplate.status !== "ARCHIVED",
      timezone: options.timezone || "Pacific/Auckland",
      hasHolidayConflicts: false,
    },
    journeyIdSuggestions: generateJourneyIdSuggestions(selectedTemplate),
  };

  return { templates: summaries, detail };
}

export function isReservedPrefix(id: string) {
  const upper = id.toUpperCase();
  return RESERVED_PREFIXES.find((prefix) => upper.startsWith(prefix)) || null;
}

export function normaliseJourneyId(id: string) {
  return id.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export type { JourneyTemplateWithRelations, DocumentSummary };
