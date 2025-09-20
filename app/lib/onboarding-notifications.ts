import { resend } from "@/lib/resend";
import { prisma } from "@/lib/prisma";
import {
  Employee,
  OnboardingNotificationType,
  OnboardingStep,
  OnboardingTemplate,
  Prisma,
  User,
} from "@prisma/client";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@peoplecore.co.nz";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "";

type MinimalUser = Pick<
  User,
  "id" | "email" | "firstName" | "lastName" | "name" | "managerId"
>;

type NotificationFlags = {
  notifyManagers: boolean;
  notifyTaskOwners: boolean;
  notifyHiringManagers: boolean;
  notifyEmployee: boolean;
  notifyAdmins: boolean;
};

export const ONBOARDING_NOTIFICATION_DEFAULTS: Record<
  OnboardingNotificationType,
  NotificationFlags
> = {
  [OnboardingNotificationType.KICKOFF]: {
    notifyManagers: true,
    notifyTaskOwners: true,
    notifyHiringManagers: false,
    notifyEmployee: false,
    notifyAdmins: false,
  },
  [OnboardingNotificationType.STEP_UPDATE]: {
    notifyManagers: false,
    notifyTaskOwners: true,
    notifyHiringManagers: false,
    notifyEmployee: false,
    notifyAdmins: false,
  },
};

type RecipientRole =
  | "manager"
  | "hiring_manager"
  | "task_owner"
  | "admin"
  | "employee";

const ROLE_LABELS: Record<RecipientRole, string> = {
  manager: "People Manager",
  hiring_manager: "Hiring Manager",
  task_owner: "Onboarding Task Owner",
  admin: "Company Admin",
  employee: "Employee",
};

type StepSummary = Pick<
  OnboardingStep,
  "id" | "label" | "order" | "taskOwnerId" | "type"
>;

type RecipientRecord = {
  user: MinimalUser;
  roles: Set<RecipientRole>;
  steps: StepSummary[];
};

function formatUserName(user?: MinimalUser | null): string {
  if (!user) return "";
  if (user.firstName || user.lastName) {
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  }
  return user.name || user.email || "";
}

function extractHiringManagerId(
  onboardingStatus: Prisma.JsonValue | null | undefined,
): string | null {
  if (!onboardingStatus || typeof onboardingStatus !== "object") {
    return null;
  }
  const status = onboardingStatus as Record<string, unknown>;
  const value = status?.hiringManagerId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function ensureRecipient(
  recipients: Map<string, RecipientRecord>,
  user: MinimalUser,
): RecipientRecord {
  const existing = recipients.get(user.id);
  if (existing) {
    return existing;
  }
  const record: RecipientRecord = {
    user,
    roles: new Set<RecipientRole>(),
    steps: [],
  };
  recipients.set(user.id, record);
  return record;
}

function rolesToSentence(roles: Set<RecipientRole>): string {
  const parts = Array.from(roles).map((role) => ROLE_LABELS[role]);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${parts.join(", ")} and ${last}`;
}

function buildStepListHtml(steps: StepSummary[], ownerName: string): string {
  if (!steps.length) {
    return `
      <p>You have been included for visibility as ${ownerName}.</p>
    `;
  }

  const items = steps
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(
      (step) => `
        <li>
          <strong>${step.label}</strong>
          <span style="color:#6b7280;"> (Step ${(step.order ?? 0) + 1})</span>
        </li>
      `,
    )
    .join("");

  return `
    <p>The following onboarding tasks are allocated to you:</p>
    <ul style="padding-left:20px;">${items}</ul>
  `;
}

function buildStepListText(steps: StepSummary[]): string {
  if (!steps.length) {
    return "No direct tasks assigned.";
  }
  return steps
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step, index) => `${index + 1}. ${step.label}`)
    .join("\n");
}

export async function resolveOnboardingNotificationSettings({
  companyId,
  templateId,
  notificationType,
}: {
  companyId: string;
  templateId?: string;
  notificationType: OnboardingNotificationType;
}): Promise<NotificationFlags> {
  const defaults = ONBOARDING_NOTIFICATION_DEFAULTS[notificationType];

  const [companyPreference, templatePreference] = await Promise.all([
    prisma.onboardingNotificationPreference.findFirst({
      where: {
        companyId,
        notificationType,
        templateId: null,
      },
    }),
    templateId
      ? prisma.onboardingNotificationPreference.findFirst({
          where: {
            companyId,
            notificationType,
            templateId,
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    notifyManagers:
      templatePreference?.notifyManagers ??
      companyPreference?.notifyManagers ??
      defaults.notifyManagers,
    notifyTaskOwners:
      templatePreference?.notifyTaskOwners ??
      companyPreference?.notifyTaskOwners ??
      defaults.notifyTaskOwners,
    notifyHiringManagers:
      templatePreference?.notifyHiringManagers ??
      companyPreference?.notifyHiringManagers ??
      defaults.notifyHiringManagers,
    notifyEmployee:
      templatePreference?.notifyEmployee ??
      companyPreference?.notifyEmployee ??
      defaults.notifyEmployee,
    notifyAdmins:
      templatePreference?.notifyAdmins ??
      companyPreference?.notifyAdmins ??
      defaults.notifyAdmins,
  };
}

export async function sendOnboardingKickoffNotifications({
  employee,
  template,
  onboardingInstanceId,
  companyId,
}: {
  employee: Employee & { User: MinimalUser | null; onboardingStatus?: Prisma.JsonValue };
  template: OnboardingTemplate & { OnboardingStep: StepSummary[] };
  onboardingInstanceId: string;
  companyId: string;
}): Promise<void> {
  const preferences = await resolveOnboardingNotificationSettings({
    companyId,
    templateId: template.id,
    notificationType: OnboardingNotificationType.KICKOFF,
  });

  if (
    !preferences.notifyAdmins &&
    !preferences.notifyEmployee &&
    !preferences.notifyManagers &&
    !preferences.notifyTaskOwners &&
    !preferences.notifyHiringManagers
  ) {
    return;
  }

  const sortedSteps = [...template.OnboardingStep].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const stepsByOwner = new Map<string, StepSummary[]>();
  if (preferences.notifyTaskOwners) {
    for (const step of sortedSteps) {
      if (!step.taskOwnerId) continue;
      const list = stepsByOwner.get(step.taskOwnerId) ?? [];
      list.push(step);
      stepsByOwner.set(step.taskOwnerId, list);
    }
  }

  const targetIds = new Set<string>();
  for (const ownerId of stepsByOwner.keys()) {
    targetIds.add(ownerId);
  }
  const managerId = preferences.notifyManagers
    ? employee.User?.managerId ?? null
    : null;
  if (managerId) targetIds.add(managerId);

  const hiringManagerId = preferences.notifyHiringManagers
    ? extractHiringManagerId(employee.onboardingStatus ?? null)
    : null;
  if (hiringManagerId) targetIds.add(hiringManagerId);

  const [targetUsers, adminUsers] = await Promise.all([
    targetIds.size
      ? prisma.user.findMany({
          where: { id: { in: Array.from(targetIds) } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            managerId: true,
          },
        })
      : Promise.resolve([] as MinimalUser[]),
    preferences.notifyAdmins
      ? prisma.user.findMany({
          where: { companyId, role: "ADMIN" },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            managerId: true,
          },
        })
      : Promise.resolve([] as MinimalUser[]),
  ]);

  const knownUsers = new Map<string, MinimalUser>();
  for (const user of targetUsers) {
    knownUsers.set(user.id, user);
  }
  for (const admin of adminUsers) {
    knownUsers.set(admin.id, admin);
  }
  if (employee.User) {
    knownUsers.set(employee.User.id, employee.User);
  }

  const recipients = new Map<string, RecipientRecord>();

  if (preferences.notifyTaskOwners) {
    for (const [ownerId, ownerSteps] of stepsByOwner.entries()) {
      const owner = knownUsers.get(ownerId);
      if (!owner?.email) continue;
      const record = ensureRecipient(recipients, owner);
      record.roles.add("task_owner");
      record.steps.push(...ownerSteps);
    }
  }

  if (preferences.notifyManagers && managerId) {
    const manager = knownUsers.get(managerId);
    if (manager?.email) {
      const record = ensureRecipient(recipients, manager);
      record.roles.add("manager");
    }
  }

  if (preferences.notifyHiringManagers && hiringManagerId) {
    const hiringManager = knownUsers.get(hiringManagerId);
    if (hiringManager?.email) {
      const record = ensureRecipient(recipients, hiringManager);
      record.roles.add("hiring_manager");
    }
  }

  if (preferences.notifyAdmins) {
    for (const admin of adminUsers) {
      if (!admin.email) continue;
      const record = ensureRecipient(recipients, admin);
      record.roles.add("admin");
    }
  }

  if (preferences.notifyEmployee && employee.User?.email) {
    const record = ensureRecipient(recipients, employee.User);
    record.roles.add("employee");
  }

  if (!recipients.size) {
    return;
  }

  const employeeName = formatUserName(employee.User) || "the new employee";
  const planUrl = APP_URL
    ? `${APP_URL}/employees/${employee.id}/onboarding`
    : "";

  const generalRows = sortedSteps
    .map((step, index) => {
      const owner = step.taskOwnerId
        ? formatUserName(knownUsers.get(step.taskOwnerId)) || "Unassigned"
        : "Unassigned";
      return `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${step.label}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${owner}</td>
          <td style="padding:8px;border:1px solid #e5e7eb; text-transform:capitalize;">${step.type.toLowerCase().replace(/_/g, " ")}</td>
        </tr>
      `;
    })
    .join("");

  const generalTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
      <thead>
        <tr style="background-color:#f3f4f6;color:#111827;">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">#</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Step</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Owner</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Type</th>
        </tr>
      </thead>
      <tbody>${generalRows}</tbody>
    </table>
  `;

  await Promise.all(
    Array.from(recipients.values()).map(async (recipient) => {
      try {
        if (!recipient.user.email) {
          return;
        }
        const name = formatUserName(recipient.user) || recipient.user.email;
        const rolesSentence = rolesToSentence(recipient.roles);
        const assignedStepsHtml = buildStepListHtml(
          recipient.steps,
          rolesSentence || "your role",
        );
        const assignedStepsText = buildStepListText(recipient.steps);

        const intro = rolesSentence
          ? `You are receiving this because you are the ${rolesSentence.toLowerCase()} for ${employeeName}'s onboarding.`
          : `${employeeName}'s onboarding has started.`;

        const html = `
          <div style="font-family:Arial, sans-serif; color:#111827; max-width:640px; margin:0 auto;">
            <h2 style="color:#1d4ed8;">Onboarding kickoff for ${employeeName}</h2>
            <p>Hi ${name},</p>
            <p>${intro}</p>
            ${assignedStepsHtml}
            <p style="margin-top:16px;">Full onboarding plan:</p>
            ${generalTable}
            ${
              planUrl
                ? `<p style="margin-top:16px;"><a href="${planUrl}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">Open onboarding workspace</a></p>`
                : ""
            }
            <p style="margin-top:16px;color:#6b7280;font-size:12px;">Onboarding instance ID: ${onboardingInstanceId}</p>
          </div>
        `;

        const text = `Onboarding kickoff for ${employeeName}\n\n${intro}\n\nTasks assigned to you:\n${assignedStepsText}\n\n${planUrl ? `View onboarding workspace: ${planUrl}\n` : ""}Onboarding instance: ${onboardingInstanceId}`;

        await resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.user.email,
          subject: `Onboarding kickoff: ${employeeName}`,
          html,
          text,
        });
      } catch (error) {
        console.error(
          "Failed to send onboarding kickoff notification",
          recipient.user.id,
          error,
        );
      }
    }),
  );
}

export async function sendOnboardingStepStatusNotification({
  employee,
  template,
  step,
  status,
  companyId,
}: {
  employee: Employee & { User: MinimalUser | null; onboardingStatus?: Prisma.JsonValue };
  template: Pick<OnboardingTemplate, "id" | "name">;
  step: StepSummary;
  status: string;
  companyId: string;
}): Promise<void> {
  const preferences = await resolveOnboardingNotificationSettings({
    companyId,
    templateId: template.id,
    notificationType: OnboardingNotificationType.STEP_UPDATE,
  });

  if (
    !preferences.notifyAdmins &&
    !preferences.notifyEmployee &&
    !preferences.notifyManagers &&
    !preferences.notifyTaskOwners &&
    !preferences.notifyHiringManagers
  ) {
    return;
  }

  const managerId = preferences.notifyManagers
    ? employee.User?.managerId ?? null
    : null;
  const hiringManagerId = preferences.notifyHiringManagers
    ? extractHiringManagerId(employee.onboardingStatus ?? null)
    : null;

  const targetIds = new Set<string>();
  if (preferences.notifyTaskOwners && step.taskOwnerId) {
    targetIds.add(step.taskOwnerId);
  }
  if (managerId) targetIds.add(managerId);
  if (hiringManagerId) targetIds.add(hiringManagerId);

  const [targetUsers, adminUsers] = await Promise.all([
    targetIds.size
      ? prisma.user.findMany({
          where: { id: { in: Array.from(targetIds) } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            managerId: true,
          },
        })
      : Promise.resolve([] as MinimalUser[]),
    preferences.notifyAdmins
      ? prisma.user.findMany({
          where: { companyId, role: "ADMIN" },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            managerId: true,
          },
        })
      : Promise.resolve([] as MinimalUser[]),
  ]);

  const knownUsers = new Map<string, MinimalUser>();
  for (const user of targetUsers) {
    knownUsers.set(user.id, user);
  }
  for (const admin of adminUsers) {
    knownUsers.set(admin.id, admin);
  }
  if (employee.User) {
    knownUsers.set(employee.User.id, employee.User);
  }

  const recipients = new Map<string, RecipientRecord>();

  if (preferences.notifyTaskOwners && step.taskOwnerId) {
    const owner = knownUsers.get(step.taskOwnerId);
    if (owner?.email) {
      const record = ensureRecipient(recipients, owner);
      record.roles.add("task_owner");
      record.steps.push(step);
    }
  }

  if (preferences.notifyManagers && managerId) {
    const manager = knownUsers.get(managerId);
    if (manager?.email) {
      const record = ensureRecipient(recipients, manager);
      record.roles.add("manager");
    }
  }

  if (preferences.notifyHiringManagers && hiringManagerId) {
    const hiringManager = knownUsers.get(hiringManagerId);
    if (hiringManager?.email) {
      const record = ensureRecipient(recipients, hiringManager);
      record.roles.add("hiring_manager");
    }
  }

  if (preferences.notifyAdmins) {
    for (const admin of adminUsers) {
      if (!admin.email) continue;
      const record = ensureRecipient(recipients, admin);
      record.roles.add("admin");
    }
  }

  if (preferences.notifyEmployee && employee.User?.email) {
    const record = ensureRecipient(recipients, employee.User);
    record.roles.add("employee");
  }

  if (!recipients.size) {
    return;
  }

  const employeeName = formatUserName(employee.User) || "the employee";
  const statusLabel = status.replace(/_/g, " ").toLowerCase();
  const planUrl = APP_URL
    ? `${APP_URL}/employees/${employee.id}/onboarding`
    : "";

  await Promise.all(
    Array.from(recipients.values()).map(async (recipient) => {
      try {
        if (!recipient.user.email) return;
        const name = formatUserName(recipient.user) || recipient.user.email;
        const rolesSentence = rolesToSentence(recipient.roles);
        const ownerMessage = recipient.roles.has("task_owner")
          ? "Please review the task details and complete any follow-up actions."
          : "This update is shared with you for visibility.";

        const html = `
          <div style="font-family:Arial, sans-serif; color:#111827; max-width:640px; margin:0 auto;">
            <h2 style="color:#1d4ed8;">Onboarding step ${statusLabel}</h2>
            <p>Hi ${name},</p>
            <p>The onboarding step <strong>${step.label}</strong> for ${employeeName} (${template.name}) has been ${statusLabel}.</p>
            ${rolesSentence ? `<p>Role: ${rolesSentence}</p>` : ""}
            <p>${ownerMessage}</p>
            ${
              planUrl
                ? `<p style="margin-top:16px;"><a href="${planUrl}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">Open onboarding workspace</a></p>`
                : ""
            }
          </div>
        `;

        const text = `Onboarding step ${statusLabel}\n\nStep: ${step.label}\nEmployee: ${employeeName}\nTemplate: ${template.name}\n${rolesSentence ? `Role: ${rolesSentence}\n` : ""}${ownerMessage}\n${planUrl ? `View onboarding workspace: ${planUrl}\n` : ""}`;

        await resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.user.email,
          subject: `Onboarding step ${statusLabel}: ${step.label}`,
          html,
          text,
        });
      } catch (error) {
        console.error(
          "Failed to send onboarding step notification",
          recipient.user.id,
          error,
        );
      }
    }),
  );
}
