import { prisma } from '@/lib/prisma';
import { mapSteps } from './stepMapper';

export async function createTemplate(
  session: any,
  body: any,
  prismaClient = prisma
) {
  const { name, description, departments = [], jobRoles = [], steps = [], isActive = false } = body;
  const filteredSteps = mapSteps(steps);
  return prismaClient.onboardingTemplate.create({
    data: {
      name,
      description: description || '',
      companyId: session.user.companyId,
      isActive: Boolean(isActive),
      updatedById: session.user.id,
      departments: departments.length > 0 ? { connect: departments.map((id: string) => ({ id })) } : undefined,
      jobRoles: jobRoles.length > 0 ? { connect: jobRoles.map((id: string) => ({ id })) } : undefined,
      steps: filteredSteps.length > 0 ? { create: filteredSteps } : undefined,
    },
    include: {
      departments: { select: { id: true, name: true } },
      jobRoles: { select: { id: true, name: true } },
      steps: true,
      updatedBy: { select: { id: true, name: true, email: true } },
    },
  });
}
