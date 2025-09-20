import { prisma } from "@/lib/prisma";
import { mapSteps } from "./stepMapper";
import { OnboardingNotificationType } from "@prisma/client";
import {
  ONBOARDING_NOTIFICATION_DEFAULTS,
  resolveOnboardingNotificationSettings,
} from "@/lib/onboarding-notifications";

const NOTIFICATION_KEYS = [
  "notifyManagers",
  "notifyTaskOwners",
  "notifyHiringManagers",
  "notifyEmployee",
  "notifyAdmins",
] as const;

type NotificationPreferenceKey = (typeof NOTIFICATION_KEYS)[number];

export type TemplateNotificationPreferenceOverrides = Partial<
  Record<NotificationPreferenceKey, boolean>
>;

export interface TemplateNotificationPreferencesInput {
  kickoff?: TemplateNotificationPreferenceOverrides | null;
  stepUpdate?: TemplateNotificationPreferenceOverrides | null;
}

function sanitizeOverrides(
  overrides: TemplateNotificationPreferenceOverrides | null | undefined,
): Partial<Record<NotificationPreferenceKey, boolean>> {
  const sanitized: Partial<Record<NotificationPreferenceKey, boolean>> = {};
  if (!overrides) {
    return sanitized;
  }
  for (const key of NOTIFICATION_KEYS) {
    if (typeof overrides[key] === "boolean") {
      sanitized[key] = overrides[key] as boolean;
    }
  }
  return sanitized;
}

async function applyTemplateNotificationPreferences({
  companyId,
  templateId,
  preferences,
  prismaClient = prisma,
}: {
  companyId: string;
  templateId: string;
  preferences?: TemplateNotificationPreferencesInput | null;
  prismaClient?: typeof prisma;
}) {
  if (!preferences) {
    return;
  }

  const entries: Array<{
    type: OnboardingNotificationType;
    overrides: TemplateNotificationPreferenceOverrides | null | undefined;
  }> = [
    {
      type: OnboardingNotificationType.KICKOFF,
      overrides: preferences.kickoff,
    },
    {
      type: OnboardingNotificationType.STEP_UPDATE,
      overrides: preferences.stepUpdate,
    },
  ];

  for (const { type, overrides } of entries) {
    if (overrides === undefined) {
      continue;
    }

    if (overrides === null) {
      await prismaClient.onboardingNotificationPreference
        .delete({
          where: {
            companyId_templateId_notificationType: {
              companyId,
              templateId,
              notificationType: type,
            },
          },
        })
        .catch(() => {});
      continue;
    }

    const sanitized = sanitizeOverrides(overrides);
    if (!Object.keys(sanitized).length) {
      continue;
    }

    await prismaClient.onboardingNotificationPreference.upsert({
      where: {
        companyId_templateId_notificationType: {
          companyId,
          templateId,
          notificationType: type,
        },
      },
      update: sanitized,
      create: {
        companyId,
        templateId,
        notificationType: type,
        ...ONBOARDING_NOTIFICATION_DEFAULTS[type],
        ...sanitized,
      },
    });
  }
}

export async function getTemplateNotificationPreferences(
  companyId: string,
  templateId: string,
) {
  const [kickoff, stepUpdate] = await Promise.all([
    resolveOnboardingNotificationSettings({
      companyId,
      templateId,
      notificationType: OnboardingNotificationType.KICKOFF,
    }),
    resolveOnboardingNotificationSettings({
      companyId,
      templateId,
      notificationType: OnboardingNotificationType.STEP_UPDATE,
    }),
  ]);

  return {
    kickoff,
    stepUpdate,
  };
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
    notificationPreferences = null,
  } = body;
  const filteredSteps = mapSteps(steps);
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

  await applyTemplateNotificationPreferences({
    companyId: session.user.companyId,
    templateId: template.id,
    preferences: notificationPreferences,
    prismaClient,
  });

  const preferences = await getTemplateNotificationPreferences(
    session.user.companyId,
    template.id,
  );

  return { ...template, notificationPreferences: preferences };
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
    notificationPreferences = undefined,
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

  const template = await prismaClient.onboardingTemplate.update({
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

  await applyTemplateNotificationPreferences({
    companyId: session.user.companyId,
    templateId: id,
    preferences: notificationPreferences,
    prismaClient,
  });

  const preferences = await getTemplateNotificationPreferences(
    session.user.companyId,
    id,
  );

  return { ...template, notificationPreferences: preferences };
}

