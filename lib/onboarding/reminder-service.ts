/**
 * Onboarding Reminder Notification Service
 * 
 * Integrates with email notification service ensuring reminders respect
 * tenant-specific branding, sender domains, and unsubscribe preferences.
 */

import { resend, PEOPLECORE_FROM_EMAIL } from '../../app/lib/resend';
import { renderPeopleCoreEmail } from '../../app/lib/email/template';
import { prisma } from '../../app/lib/prisma';
import { getNZPublicHolidays, calculateBusinessDays } from './reminder-types';

export interface ReminderEmailData {
  employeeName: string;
  employeeEmail: string;
  stepTitle: string;
  stepDescription?: string;
  dueDate?: Date;
  onboardingUrl: string;
  companyName: string;
  escalated?: boolean;
  escalatedToName?: string;
}

export interface BrandingConfig {
  enabled: boolean;
  logoUrl?: string;
  primaryColor?: string;
  emailFooterText?: string;
}

/**
 * Send onboarding step reminder email
 * 
 * @param data - Reminder email data
 * @param brandingConfig - Tenant-specific branding configuration
 * @returns Result of email send operation
 */
export async function sendStepReminderEmail(
  data: ReminderEmailData,
  brandingConfig?: BrandingConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = renderPeopleCoreEmail({
      title: data.escalated ? 'Onboarding Step Escalation' : 'Onboarding Step Reminder',
      heroBadge: data.escalated ? 'ESCALATED' : 'REMINDER',
      intro: data.escalated
        ? [
            `Hi ${data.escalatedToName || 'there'},`,
            `An onboarding step requires attention for ${data.employeeName}.`,
          ]
        : [`Hi ${data.employeeName},`, 'You have an onboarding step that needs your attention.'],
      sections: [
        {
          title: data.stepTitle,
          description: data.stepDescription || 'Please complete this step to continue your onboarding.',
          highlight: data.escalated,
        },
        ...(data.dueDate
          ? [
              {
                eyebrow: 'DUE DATE',
                html: `<p style="font-size: 16px; font-weight: 600; margin: 0;">${data.dueDate.toLocaleDateString('en-NZ', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>`,
              },
            ]
          : []),
      ],
      ctas: {
        label: 'Complete This Step',
        href: data.onboardingUrl,
      },
      outro: data.escalated
        ? `This step was escalated because it has not been completed within the expected timeframe.`
        : `Completing your onboarding steps helps ensure a smooth start at ${data.companyName}.`,
      footer: brandingConfig?.emailFooterText,
    });

    const fromEmail = brandingConfig?.enabled
      ? `${data.companyName} <${PEOPLECORE_FROM_EMAIL.split('<')[1]?.replace('>', '') || 'noreply@peoplecore.co.nz'}>`
      : PEOPLECORE_FROM_EMAIL;

    const result = await resend.emails.send({
      from: fromEmail,
      to: data.employeeEmail,
      subject: data.escalated
        ? `⚠️ Onboarding Step Escalation - ${data.stepTitle}`
        : `⏰ Onboarding Reminder - ${data.stepTitle}`,
      html,
      text,
    });

    if (result.error) {
      console.error('Failed to send onboarding reminder email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending onboarding reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Schedule a reminder for an onboarding step
 * 
 * @param params - Reminder scheduling parameters
 * @returns Created reminder record
 */
export async function scheduleStepReminder(params: {
  companyId: string;
  onboardingInstanceId: string;
  stepInstanceId: string;
  stepId: string;
  employeeId: string;
  reminderType: 'initial' | 'escalation';
  scheduledFor: Date;
  recipientEmail: string;
  recipientName: string;
  escalatedTo?: string;
}) {
  return await prisma.onboardingReminder.create({
    data: {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId: params.companyId,
      onboardingInstanceId: params.onboardingInstanceId,
      stepInstanceId: params.stepInstanceId,
      stepId: params.stepId,
      employeeId: params.employeeId,
      reminderType: params.reminderType,
      scheduledFor: params.scheduledFor,
      status: 'pending',
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      escalatedTo: params.escalatedTo,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Process pending reminders (called by cron job)
 * 
 * @param batchSize - Number of reminders to process in one batch
 */
export async function processPendingReminders(batchSize: number = 50) {
  const now = new Date();

  // Fetch pending reminders that are due
  const pendingReminders = await prisma.onboardingReminder.findMany({
    where: {
      status: 'pending',
      scheduledFor: {
        lte: now,
      },
    },
    take: batchSize,
    include: {
      Step: {
        include: {
          OnboardingTemplate: true,
        },
      },
      Employee: {
        include: {
          User: true,
        },
      },
      Company: {
        include: {
          BrandingConfiguration: true,
        },
      },
      OnboardingInstance: true,
    },
  });

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const reminder of pendingReminders) {
    try {
      const brandingConfig: BrandingConfig = {
        enabled: reminder.Company.BrandingConfiguration?.enabled || false,
        logoUrl: reminder.Company.BrandingConfiguration?.logoUrl || undefined,
        primaryColor: reminder.Company.BrandingConfiguration?.primaryColor || undefined,
        emailFooterText: reminder.Company.BrandingConfiguration?.emailFooterText || undefined,
      };

      const emailData: ReminderEmailData = {
        employeeName: reminder.Employee.User.name || reminder.Employee.User.email,
        employeeEmail: reminder.recipientEmail,
        stepTitle: reminder.Step.label,
        stepDescription: reminder.Step.instruction || undefined,
        onboardingUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://peoplecore.co.nz'}/onboarding`,
        companyName: reminder.Company.name,
        escalated: reminder.reminderType === 'escalation',
      };

      // If escalated, get escalated user name
      if (reminder.escalatedTo) {
        const escalatedUser = await prisma.user.findUnique({
          where: { id: reminder.escalatedTo },
          select: { name: true },
        });
        emailData.escalatedToName = escalatedUser?.name || undefined;
      }

      const result = await sendStepReminderEmail(emailData, brandingConfig);

      if (result.success) {
        await prisma.onboardingReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date(),
          },
        });
        results.sent++;
      } else {
        await prisma.onboardingReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'failed',
            failureReason: result.error || 'Unknown error',
            updatedAt: new Date(),
          },
        });
        results.failed++;
        results.errors.push(`Reminder ${reminder.id}: ${result.error}`);
      }

      results.processed++;
    } catch (error) {
      console.error(`Error processing reminder ${reminder.id}:`, error);
      results.failed++;
      results.errors.push(`Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

/**
 * Cancel all pending reminders for a completed step
 * 
 * @param stepInstanceId - The step instance ID
 */
export async function cancelStepReminders(stepInstanceId: string) {
  return await prisma.onboardingReminder.updateMany({
    where: {
      stepInstanceId,
      status: 'pending',
    },
    data: {
      status: 'cancelled',
      updatedAt: new Date(),
    },
  });
}

/**
 * Create reminders when onboarding instance is started
 * 
 * @param onboardingInstanceId - The onboarding instance ID
 */
export async function createRemindersForOnboardingInstance(onboardingInstanceId: string) {
  const instance = await prisma.onboardingInstance.findUnique({
    where: { id: onboardingInstanceId },
    include: {
      OnboardingStepInstance: {
        include: {
          OnboardingStep: true,
        },
      },
      Employee: {
        include: {
          User: {
            select: {
              email: true,
              name: true,
              managerId: true,
            },
          },
        },
      },
      OnboardingTemplate: {
        include: {
          Company: {
            include: {
              User: {
                where: {
                  role: 'HR_ADMIN',
                },
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!instance) {
    throw new Error(`Onboarding instance ${onboardingInstanceId} not found`);
  }

  const publicHolidays = getNZPublicHolidays(new Date().getFullYear());
  const createdReminders: any[] = [];

  for (const stepInstance of instance.OnboardingStepInstance) {
    const step = stepInstance.OnboardingStep;

    // Skip if reminder not enabled
    if (!step.reminderEnabled) {
      continue;
    }

    const startDate = instance.startedAt;

    // Calculate reminder date considering business days
    let reminderDate: Date;
    if (step.excludeWeekends || step.excludePublicHolidays) {
      reminderDate = calculateBusinessDays(
        startDate,
        step.reminderDaysBefore || 1,
        step.excludeWeekends || false,
        step.excludePublicHolidays !== false,
        publicHolidays
      );
    } else {
      reminderDate = new Date(startDate);
      reminderDate.setDate(reminderDate.getDate() + (step.reminderDaysBefore || 1));
    }

    // Set reminder time
    if (step.reminderTime) {
      const [hours, minutes] = step.reminderTime.split(':').map(Number);
      reminderDate.setHours(hours, minutes, 0, 0);
    } else {
      reminderDate.setHours(9, 0, 0, 0); // Default to 9 AM
    }

    // Create initial reminder
    const initialReminder = await scheduleStepReminder({
      companyId: instance.OnboardingTemplate.companyId,
      onboardingInstanceId: instance.id,
      stepInstanceId: stepInstance.id,
      stepId: step.id,
      employeeId: instance.employeeId,
      reminderType: 'initial',
      scheduledFor: reminderDate,
      recipientEmail: instance.Employee.User.email,
      recipientName: instance.Employee.User.name || instance.Employee.User.email,
    });

    createdReminders.push(initialReminder);

    // Create escalation reminder if enabled
    if (step.reminderEscalationEnabled && step.reminderEscalationDays) {
      const escalationDate = new Date(reminderDate);
      escalationDate.setDate(escalationDate.getDate() + step.reminderEscalationDays);

      let escalatedEmail = instance.Employee.User.email;
      let escalatedUserId: string | undefined;

      // Determine escalation recipient
      if (step.reminderEscalationRole === 'manager' && instance.Employee.User.managerId) {
        const manager = await prisma.user.findUnique({
          where: { id: instance.Employee.User.managerId },
          select: { id: true, email: true },
        });
        if (manager) {
          escalatedEmail = manager.email;
          escalatedUserId = manager.id;
        }
      } else if (step.reminderEscalationRole === 'hr_admin') {
        const hrAdmin = instance.OnboardingTemplate.Company.User[0];
        if (hrAdmin) {
          escalatedEmail = hrAdmin.email;
          escalatedUserId = hrAdmin.id;
        }
      } else if (step.reminderEscalationRole === 'custom' && step.reminderEscalationUserId) {
        const customUser = await prisma.user.findUnique({
          where: { id: step.reminderEscalationUserId },
          select: { id: true, email: true },
        });
        if (customUser) {
          escalatedEmail = customUser.email;
          escalatedUserId = customUser.id;
        }
      }

      const escalationReminder = await scheduleStepReminder({
        companyId: instance.OnboardingTemplate.companyId,
        onboardingInstanceId: instance.id,
        stepInstanceId: stepInstance.id,
        stepId: step.id,
        employeeId: instance.employeeId,
        reminderType: 'escalation',
        scheduledFor: escalationDate,
        recipientEmail: escalatedEmail,
        recipientName: instance.Employee.User.name || instance.Employee.User.email,
        escalatedTo: escalatedUserId,
      });

      createdReminders.push(escalationReminder);
    }
  }

  return createdReminders;
}
