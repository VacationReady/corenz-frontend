import { prisma } from "@/lib/prisma";
import { normalizeStepMetadata } from "@/lib/onboarding/stepMetadata";
import { mapDbStepTypeToUi } from "@/lib/onboarding/stepTypeMapping";
import {
  metadataValuesAreEqual,
  prepareMetadataForTelemetry,
  recordOnboardingTelemetryBatch,
  recordOnboardingTelemetryEvent,
  summariseMetadataDiff,
  type OnboardingTelemetryEventInput,
} from "@/lib/onboarding/telemetry";

const templateSelect = {
  id: true,
  companyId: true,
  name: true,
  description: true,
  isActive: true,
  updatedAt: true,
  User: { select: { id: true, name: true, email: true } },
  Department: { select: { id: true, name: true } },
  JobRole: { select: { id: true, name: true } },
  OnboardingStep: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      order: true,
      templateId: true,
      documentId: true,
      uploadType: true,
      instruction: true,
      formId: true,
      dependencies: true,
      metadata: true,
      slaDays: true,
      taskOwnerId: true,
      trainingId: true,
      Document: { select: { id: true, name: true } },
      Form: { select: { id: true, name: true } },
    },
  },
} as const;

type RawStep = {
  id: string;
  type: string;
  label: string;
  order: number;
  templateId: string;
  documentId: string | null;
  uploadType: string | null;
  instruction: string | null;
  formId: string | null;
  dependencies: string[];
  metadata: any;
  slaDays: number | null;
  taskOwnerId: string | null;
  trainingId: string | null;
  Document: { id: string; name: string | null } | null;
  Form: { id: string; name: string | null } | null;
};

type RawTemplate = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  updatedAt: Date;
  User: { id: string; name: string | null; email: string | null } | null;
  Department: { id: string; name: string | null }[];
  JobRole: { id: string; name: string | null }[];
  OnboardingStep: RawStep[];
};

const sanitizeStep = (step: RawStep) => {
  const uiType = mapDbStepTypeToUi(step.type) ||
    (typeof step.type === "string"
      ? step.type.toLowerCase().replace(/_/g, "-")
      : step.type);
  return {
    id: step.id,
    type: step.type,
    uiType,
    label: step.label,
    order: step.order,
    templateId: step.templateId,
    documentId: step.documentId ?? null,
    uploadType: step.uploadType ?? null,
    instruction: step.instruction ?? null,
    formId: step.formId ?? null,
    dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
    metadata: normalizeStepMetadata(uiType, step.metadata),
    slaDays: step.slaDays ?? null,
    taskOwnerId: step.taskOwnerId ?? null,
    trainingId: step.trainingId ?? null,
    Document: step.Document ?? null,
    Form: step.Form ?? null,
  };
};

export type SerializedOnboardingTemplate = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  updatedAt: Date;
  updatedBy: { id: string; name: string | null; email: string | null } | null;
  departments: { id: string; name: string | null }[];
  jobRoles: { id: string; name: string | null }[];
  steps: ReturnType<typeof sanitizeStep>[];
};

export function serializeTemplate(
  template: RawTemplate,
  currentCompanyId: string,
): SerializedOnboardingTemplate {
  if (template.companyId !== currentCompanyId) {
    throw new Error("Template does not belong to the current tenant");
  }

  return {
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    isActive: Boolean(template.isActive),
    updatedAt: template.updatedAt,
    updatedBy: template.User ?? null,
    departments: template.Department ?? [],
    jobRoles: template.JobRole ?? [],
    steps: Array.isArray(template.OnboardingStep)
      ? template.OnboardingStep.map(sanitizeStep)
      : [],
  };
}

export async function fetchTenantTemplates(
  companyId: string,
  prismaClient = prisma,
) {
  const telemetryEvents: OnboardingTelemetryEventInput[] = [];

  try {
    const templates = await prismaClient.onboardingTemplate.findMany({
      where: { companyId },
      select: templateSelect,
      orderBy: { createdAt: "asc" },
    });

    const serializedTemplates: SerializedOnboardingTemplate[] = [];

    for (const template of templates) {
      if (template.companyId !== companyId) {
        telemetryEvents.push({
          companyId,
          eventType: "template_load_failure",
          severity: "error",
          message: `Cross-tenant template load attempt blocked for template ${template.id}`,
          templateId: template.id,
          metadata: {
            expectedCompanyId: companyId,
            templateCompanyId: template.companyId,
            templateName: template.name,
          },
        });
        continue;
      }

      let serialized: SerializedOnboardingTemplate;
      try {
        serialized = serializeTemplate(template, companyId);
      } catch (error) {
        telemetryEvents.push({
          companyId,
          eventType: "template_load_failure",
          severity: "error",
          message: `Failed to serialize onboarding template ${template.name || template.id}`,
          templateId: template.id,
          metadata: {
            templateName: template.name,
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : { message: String(error) },
          },
        });
        continue;
      }

      const rawSteps = Array.isArray(template.OnboardingStep)
        ? template.OnboardingStep
        : [];

      rawSteps.forEach((rawStep, index) => {
        const sanitisedStep = serialized.steps[index];
        if (!sanitisedStep) {
          return;
        }

        if (
          !metadataValuesAreEqual(
            rawStep.metadata ?? null,
            sanitisedStep.metadata ?? null,
          )
        ) {
          telemetryEvents.push({
            companyId,
            eventType: "metadata_mismatch",
            severity: "warning",
            templateId: template.id,
            stepId: rawStep.id,
            message: `Metadata mismatch detected for step "${rawStep.label}"`,
            metadata: {
              templateName: template.name,
              stepLabel: rawStep.label,
              uiType: sanitisedStep.uiType,
              mismatchedKeys: summariseMetadataDiff(
                rawStep.metadata ?? null,
                sanitisedStep.metadata ?? null,
              ),
              rawMetadata: prepareMetadataForTelemetry(
                rawStep.metadata ?? null,
              ),
              normalizedMetadata: prepareMetadataForTelemetry(
                sanitisedStep.metadata ?? null,
              ),
            },
          });
        }
      });

      serializedTemplates.push(serialized);
    }

    if (telemetryEvents.length) {
      await recordOnboardingTelemetryBatch(telemetryEvents, prismaClient);
    }

    return serializedTemplates;
  } catch (error) {
    await recordOnboardingTelemetryEvent(
      {
        companyId,
        eventType: "template_load_failure",
        severity: "error",
        message: "Unhandled error loading onboarding templates",
        metadata: {
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: String(error) },
        },
      },
      prismaClient,
    );
    throw error;
  }
}

export { templateSelect };
