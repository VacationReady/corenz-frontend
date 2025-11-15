import { prisma } from "@/lib/prisma";
import { normalizeStepMetadata } from "@/lib/onboarding/stepMetadata";
import { mapDbStepTypeToUi } from "@/lib/onboarding/stepTypeMapping";

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
  const templates = await prismaClient.onboardingTemplate.findMany({
    where: { companyId },
    select: templateSelect,
    orderBy: { createdAt: "asc" },
  });

  return templates
    .filter((template: any) => template.companyId === companyId)
    .map((template: any) => serializeTemplate(template, companyId));
}

export { templateSelect };
