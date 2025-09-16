import { prisma } from "@/lib/prisma";
import { mapSteps } from "./stepMapper";

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
  const filteredSteps = mapSteps(steps);
  return prismaClient.onboardingTemplate.create({
    data: {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || "",
      companyId: session.user.companyId,
      isActive: Boolean(isActive),
      updatedById: session.user.id,
      updatedAt: new Date(),
      Department:
        departments.length > 0
          ? { connect: departments.map((id: string) => ({ id })) }
          : undefined,
      JobRole:
        jobRoles.length > 0
          ? { connect: jobRoles.map((id: string) => ({ id })) }
          : undefined,
      OnboardingStep: filteredSteps.length > 0 ? { create: filteredSteps } : undefined,
    },
    include: {
      Department: { select: { id: true, name: true } },
      JobRole: { select: { id: true, name: true } },
      OnboardingStep: true,
      User: { select: { id: true, name: true, email: true } },
    },
  });
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
  } = body;
  const filteredSteps = mapSteps(steps);

  // Remove existing step data with cascading order
  await prismaClient.onboardingStepResponse.deleteMany({
    where: { OnboardingStepInstance: { OnboardingStep: { templateId: id } } },
  });
  await prismaClient.onboardingStepInstance.deleteMany({
    where: { OnboardingStep: { templateId: id } },
  });
  await prismaClient.onboardingStep.deleteMany({ where: { templateId: id } });

  return prismaClient.onboardingTemplate.update({
    where: { id },
    data: {
      name,
      description: description || "",
      isActive: Boolean(isActive),
      updatedById: session.user.id,
      Department: {
        set: [],
        connect:
          departments.length > 0
            ? departments.map((id: string) => ({ id }))
            : [],
      },
      JobRole: {
        set: [],
        connect:
          jobRoles.length > 0 ? jobRoles.map((id: string) => ({ id })) : [],
      },
      OnboardingStep: filteredSteps.length > 0 ? { create: filteredSteps } : undefined,
    },
    include: {
      Department: { select: { id: true, name: true } },
      JobRole: { select: { id: true, name: true } },
      OnboardingStep: true,
      User: { select: { id: true, name: true, email: true } },
    },
  });
}

