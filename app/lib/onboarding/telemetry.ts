import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OnboardingTelemetryEventType =
  | "template_load_failure"
  | "metadata_mismatch";

export type OnboardingTelemetrySeverity = "info" | "warning" | "error";

export type OnboardingTelemetryEventInput = {
  companyId: string;
  eventType: OnboardingTelemetryEventType;
  severity: OnboardingTelemetrySeverity;
  message: string;
  templateId?: string | null;
  stepId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type TelemetryPrismaClient = typeof prisma | (Prisma.TransactionClient & Record<string, any>);

type TelemetryModel = {
  upsert: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any>;
};

const KNOWN_SEVERITIES: OnboardingTelemetrySeverity[] = [
  "info",
  "warning",
  "error",
];

function getTelemetryModel(client: TelemetryPrismaClient | undefined):
  | TelemetryModel
  | null {
  if (!client) return null;
  const model = (client as any).onboardingTemplateTelemetryEvent;
  if (!model || typeof model.upsert !== "function") {
    return null;
  }
  return model as TelemetryModel;
}

function normaliseMetadataValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normaliseMetadataValue(entry));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, normaliseMetadataValue(entryValue)] as const)
      .sort(([a], [b]) => a.localeCompare(b));

    return entries.reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
      acc[key] = entryValue;
      return acc;
    }, {});
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (!Number.isFinite(value)) return value.toString();
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  return String(value);
}

export function prepareMetadataForTelemetry(value: unknown) {
  return normaliseMetadataValue(value);
}

function normaliseForComparison(value: unknown) {
  return normaliseMetadataValue(value);
}

export function metadataValuesAreEqual(a: unknown, b: unknown) {
  const left = normaliseForComparison(a);
  const right = normaliseForComparison(b);
  return JSON.stringify(left) === JSON.stringify(right);
}

export function summariseMetadataDiff(rawValue: unknown, normalisedValue: unknown) {
  const raw = normaliseForComparison(rawValue);
  const normalised = normaliseForComparison(normalisedValue);

  if (
    raw === null ||
    normalised === null ||
    typeof raw !== "object" ||
    typeof normalised !== "object" ||
    Array.isArray(raw) ||
    Array.isArray(normalised)
  ) {
    return metadataValuesAreEqual(raw, normalised) ? [] : ["$root"];
  }

  const keys = new Set([
    ...Object.keys(raw as Record<string, unknown>),
    ...Object.keys(normalised as Record<string, unknown>),
  ]);

  const mismatches: string[] = [];

  keys.forEach((key) => {
    const left = (raw as Record<string, unknown>)[key];
    const right = (normalised as Record<string, unknown>)[key];
    if (!metadataValuesAreEqual(left, right)) {
      mismatches.push(key);
    }
  });

  return mismatches.sort();
}

function buildFingerprint(event: OnboardingTelemetryEventInput, metadata: unknown) {
  const payload = {
    eventType: event.eventType,
    templateId: event.templateId ?? null,
    stepId: event.stepId ?? null,
    message: event.message,
    metadata,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function recordOnboardingTelemetryEvent(
  event: OnboardingTelemetryEventInput,
  prismaClient: TelemetryPrismaClient = prisma,
) {
  const telemetryModel = getTelemetryModel(prismaClient);
  if (!telemetryModel) {
    return;
  }

  const safeSeverity = KNOWN_SEVERITIES.includes(event.severity)
    ? event.severity
    : "info";
  const normalisedMetadata =
    event.metadata === undefined || event.metadata === null
      ? null
      : (prepareMetadataForTelemetry(event.metadata) as Prisma.JsonValue);
  const fingerprint = buildFingerprint(event, normalisedMetadata);

  try {
    await telemetryModel.upsert({
      where: {
        companyId_fingerprint: {
          companyId: event.companyId,
          fingerprint,
        },
      },
      update: {
        lastSeenAt: new Date(),
        occurrenceCount: { increment: 1 },
        severity: safeSeverity,
        message: event.message,
        templateId: event.templateId ?? null,
        stepId: event.stepId ?? null,
        details: normalisedMetadata,
      },
      create: {
        companyId: event.companyId,
        templateId: event.templateId ?? null,
        stepId: event.stepId ?? null,
        eventType: event.eventType,
        severity: safeSeverity,
        message: event.message,
        fingerprint,
        details: normalisedMetadata,
      },
    });
  } catch (error) {
    console.error("Failed to record onboarding telemetry event", error);
  }
}

export async function recordOnboardingTelemetryBatch(
  events: OnboardingTelemetryEventInput[],
  prismaClient: TelemetryPrismaClient = prisma,
) {
  if (!events.length) {
    return;
  }

  await Promise.allSettled(
    events.map((event) => recordOnboardingTelemetryEvent(event, prismaClient)),
  );
}

export async function getOnboardingTelemetrySnapshot(
  companyId: string,
  prismaClient: TelemetryPrismaClient = prisma,
) {
  const telemetryModel = getTelemetryModel(prismaClient);
  if (!telemetryModel) {
    return {
      company: null,
      summary: {
        totalEvents: 0,
        templateLoadFailures: 0,
        metadataMismatches: 0,
        lastUpdatedAt: null,
      },
      severityCounts: {},
      templateHotspots: [],
      recentEvents: [],
    };
  }

  const [company, events] = await Promise.all([
    (prismaClient as any).company?.findUnique?.({
      where: { id: companyId },
      select: { id: true, name: true, code: true, publicHolidayRegion: true },
    }) ?? null,
    telemetryModel.findMany({
      where: { companyId },
      orderBy: { lastSeenAt: "desc" },
      take: 50,
    }),
  ]);

  if (!company) {
    return {
      company: null,
      summary: {
        totalEvents: 0,
        templateLoadFailures: 0,
        metadataMismatches: 0,
        lastUpdatedAt: null,
      },
      severityCounts: {},
      templateHotspots: [],
      recentEvents: [],
    };
  }

  const templateIds = Array.from(
    new Set(
      events
        .map((event: any) => event.templateId)
        .filter((value: string | null) => Boolean(value)),
    ),
  ) as string[];
  const stepIds = Array.from(
    new Set(
      events
        .map((event: any) => event.stepId)
        .filter((value: string | null) => Boolean(value)),
    ),
  ) as string[];

  const [templates, steps] = await Promise.all([
    templateIds.length
      ? (prismaClient as any).onboardingTemplate?.findMany?.({
          where: { id: { in: templateIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    stepIds.length
      ? (prismaClient as any).onboardingStep?.findMany?.({
          where: { id: { in: stepIds } },
          select: { id: true, label: true, templateId: true },
        })
      : Promise.resolve([]),
  ]);

  const templateMap = new Map(
    (templates as Array<{ id: string; name: string }>).map((template) => [
      template.id,
      template.name,
    ]),
  );
  const stepMap = new Map(
    (steps as Array<{ id: string; label: string; templateId: string }>).map((step) => [
      step.id,
      step,
    ]),
  );

  const severityCounts: Record<string, number> = {};
  const summary = {
    totalEvents: events.length,
    templateLoadFailures: 0,
    metadataMismatches: 0,
    lastUpdatedAt: events.length ? events[0].lastSeenAt : null,
  };

  const templateHotspotAccumulator = new Map<
    string,
    {
      templateId: string;
      mismatchCount: number;
      lastSeenAt: Date;
      affectedSteps: Set<string>;
    }
  >();

  const recentEvents = events.map((event: any) => {
    const severity = KNOWN_SEVERITIES.includes(event.severity)
      ? event.severity
      : "info";

    severityCounts[severity] = (severityCounts[severity] || 0) + event.occurrenceCount;

    if (event.eventType === "template_load_failure") {
      summary.templateLoadFailures += event.occurrenceCount;
    }
    if (event.eventType === "metadata_mismatch") {
      summary.metadataMismatches += event.occurrenceCount;
      if (event.templateId) {
        const entry = templateHotspotAccumulator.get(event.templateId) ?? {
          templateId: event.templateId,
          mismatchCount: 0,
          lastSeenAt: event.lastSeenAt,
          affectedSteps: new Set<string>(),
        };
        entry.mismatchCount += event.occurrenceCount;
        if (event.lastSeenAt > entry.lastSeenAt) {
          entry.lastSeenAt = event.lastSeenAt;
        }
        const step = event.stepId ? stepMap.get(event.stepId) : null;
        if (step?.label) {
          entry.affectedSteps.add(step.label);
        }
        templateHotspotAccumulator.set(event.templateId, entry);
      }
    }

    return {
      id: event.id,
      eventType: event.eventType,
      severity,
      message: event.message,
      templateId: event.templateId ?? null,
      templateName: event.templateId ? templateMap.get(event.templateId) ?? null : null,
      stepId: event.stepId ?? null,
      stepLabel: event.stepId ? stepMap.get(event.stepId)?.label ?? null : null,
      occurrenceCount: event.occurrenceCount,
      firstSeenAt: event.firstSeenAt,
      lastSeenAt: event.lastSeenAt,
      details:
        event.details && event.details !== Prisma.DbNull
          ? (event.details as Prisma.JsonValue)
          : null,
    };
  });

  const templateHotspots = Array.from(templateHotspotAccumulator.values())
    .map((entry) => ({
      templateId: entry.templateId,
      templateName: templateMap.get(entry.templateId) ?? "Unknown template",
      mismatchCount: entry.mismatchCount,
      lastSeenAt: entry.lastSeenAt,
      affectedSteps: Array.from(entry.affectedSteps.values()),
    }))
    .sort((a, b) => {
      if (b.mismatchCount !== a.mismatchCount) {
        return b.mismatchCount - a.mismatchCount;
      }
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    });

  return {
    company,
    summary,
    severityCounts,
    templateHotspots,
    recentEvents,
  };
}
