import { prisma } from "@/lib/prisma";
import { normalizeStepMetadata } from "@/lib/onboarding/stepMetadata";
import { mapSteps } from "./stepMapper";
import { serializeTemplate, templateSelect } from "./tenantScopedFetch";

export class TemplateConflictError extends Error {
  latest: ReturnType<typeof serializeTemplate>;

  constructor(message: string, latest: ReturnType<typeof serializeTemplate>) {
    super(message);
    this.name = "TemplateConflictError";
    this.latest = latest;
  }
}

const sanitizeIds = (values: unknown): string[] =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );

const normalizeSteps = (steps: unknown): any[] =>
  Array.isArray(steps)
    ? steps.map((step) => ({
        ...step,
        metadata: normalizeStepMetadata(step?.type, step?.metadata),
      }))
    : [];

async function validateScopedResources(
  companyId: string,
  prismaClient: typeof prisma,
  {
    departmentIds,
    jobRoleIds,
    steps,
  }: { departmentIds: string[]; jobRoleIds: string[]; steps: any[] },
) {
  if (departmentIds.length) {
    const count = await prismaClient.department.count({
      where: { companyId, id: { in: departmentIds } },
    });
    if (count !== departmentIds.length) {
      throw new Error("Departments must belong to the current company");
    }
  }

  if (jobRoleIds.length) {
    const count = await prismaClient.jobRole.count({
      where: { companyId, id: { in: jobRoleIds } },
    });
    if (count !== jobRoleIds.length) {
      throw new Error("Job roles must belong to the current company");
    }
  }

  const documentIds = Array.from(
    new Set(
      steps
        .map((step) =>
          typeof step?.documentId === "string" ? step.documentId.trim() : "",
        )
        .filter(Boolean),
    ),
  );
  if (documentIds.length) {
    const documents = await prismaClient.document.findMany({
      where: { companyId, id: { in: documentIds } },
      select: { id: true },
    });
    if (documents.length !== documentIds.length) {
      throw new Error("Documents must belong to the current company");
    }
  }

  const formIds = Array.from(
    new Set(
      steps
        .map((step) =>
          typeof step?.formId === "string" ? step.formId.trim() : "",
        )
        .filter(Boolean),
    ),
  );
  if (formIds.length) {
    const forms = await prismaClient.form.findMany({
      where: { companyId, id: { in: formIds } },
      select: { id: true },
    });
    if (forms.length !== formIds.length) {
      throw new Error("Forms must belong to the current company");
    }
  }

  const journeyTemplateIds = Array.from(
    new Set(
      steps
        .filter((step) => step?.type === "journey-automation")
        .map((step) =>
          typeof step?.metadata?.journeyTemplateId === "string"
            ? step.metadata.journeyTemplateId.trim()
            : "",
        )
        .filter(Boolean),
    ),
  );
  if (journeyTemplateIds.length) {
    const journeys = await prismaClient.journeyTemplate.findMany({
      where: { companyId, id: { in: journeyTemplateIds } },
      select: { id: true },
    });
    if (journeys.length !== journeyTemplateIds.length) {
      throw new Error("Journey templates must belong to the current company");
    }
  }
}

export async function createTemplate(
  session: any,
  body: any,
  prismaClient = prisma,
) {
  const {
    name,
    description,
    departments = [],
    jobRoles = [],
    steps = [],
    isActive = false,
  } = body;
  const departmentIds = sanitizeIds(departments);
  const jobRoleIds = sanitizeIds(jobRoles);
  const normalizedSteps = normalizeSteps(steps);

  await validateScopedResources(session.user.companyId, prismaClient, {
    departmentIds,
    jobRoleIds,
    steps: normalizedSteps,
  });

  const filteredSteps = mapSteps(normalizedSteps);
  const template = await prismaClient.onboardingTemplate.create({
    data: {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || "",
      companyId: session.user.companyId,
      isActive: Boolean(isActive),
      updatedById: session.user.id,
      updatedAt: new Date(),
      Department:
        departmentIds.length > 0
          ? { connect: departmentIds.map((id: string) => ({ id })) }
          : undefined,
      JobRole:
        jobRoleIds.length > 0
          ? { connect: jobRoleIds.map((id: string) => ({ id })) }
          : undefined,
      OnboardingStep: filteredSteps.length > 0 ? { create: filteredSteps } : undefined,
    },
    select: templateSelect,
  });
  return serializeTemplate(
    { ...template, companyId: session.user.companyId },
    session.user.companyId,
  );
}

export async function updateTemplate(
  session: any,
  body: any,
  prismaClient = prisma,
) {
  const {
    id,
    name,
    description,
    departments = [],
    jobRoles = [],
    steps = [],
    isActive,
    lastKnownUpdatedAt,
  } = body;
  const departmentIds = sanitizeIds(departments);
  const jobRoleIds = sanitizeIds(jobRoles);
  const normalizedSteps = normalizeSteps(steps);

  await validateScopedResources(session.user.companyId, prismaClient, {
    departmentIds,
    jobRoleIds,
    steps: normalizedSteps,
  });

  const filteredSteps = mapSteps(normalizedSteps);

  const existingTemplate = await prismaClient.onboardingTemplate.findUnique({
    where: { id },
    select: templateSelect,
  });

  if (!existingTemplate || existingTemplate.companyId !== session.user.companyId) {
    throw new Error("Template not found");
  }

  if (lastKnownUpdatedAt) {
    const baseline = new Date(lastKnownUpdatedAt);
    if (Number.isNaN(baseline.getTime())) {
      throw new Error("Invalid lastKnownUpdatedAt value");
    }
    if (existingTemplate.updatedAt.getTime() !== baseline.getTime()) {
      throw new TemplateConflictError(
        "Template has been updated by another editor.",
        serializeTemplate(existingTemplate as any, session.user.companyId),
      );
    }
  }

  // Remove existing step data with cascading order
  await prismaClient.onboardingStepResponse.deleteMany({
    where: { OnboardingStepInstance: { OnboardingStep: { templateId: id } } },
  });
  await prismaClient.onboardingStepInstance.deleteMany({
    where: { OnboardingStep: { templateId: id } },
  });
  await prismaClient.onboardingStep.deleteMany({ where: { templateId: id } });

  const template = await prismaClient.onboardingTemplate.update({
    where: { id },
    data: {
      name,
      description: description || "",
      isActive: Boolean(isActive),
      updatedById: session.user.id,
      Department: {
        set: [],
        connect: departmentIds.length > 0 ? departmentIds.map((id: string) => ({ id })) : [],
      },
      JobRole: {
        set: [],
        connect: jobRoleIds.length > 0 ? jobRoleIds.map((id: string) => ({ id })) : [],
      },
      OnboardingStep: filteredSteps.length > 0 ? { create: filteredSteps } : undefined,
    },
    select: templateSelect,
  });
  return serializeTemplate(
    { ...template, companyId: session.user.companyId },
    session.user.companyId,
  );
}

