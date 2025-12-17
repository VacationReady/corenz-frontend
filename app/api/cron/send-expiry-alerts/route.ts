import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail } from "@/lib/email/template";
import { sendExitInterviewFormInvite } from "@/lib/email/send";
import { isTodayInLondon } from "@/lib/time";
import { verifyCronSecret, getUnauthorizedResponse } from "@/lib/cron/auth";

async function processCompany(companyId: string) {
  const expiryRules = await prisma.expiryRule.findMany({
    where: {
      OR: [
        { companyId },
        // Allow global rules if companyId is null for backward compatibility
        { companyId: null as any },
      ],
    },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  for (const rule of expiryRules) {
    // Calculate the exact threshold date (e.g., exactly 28 days from now)
    const thresholdStart = new Date(today);
    thresholdStart.setDate(today.getDate() + rule.daysBefore);
    thresholdStart.setHours(0, 0, 0, 0);
    
    const thresholdEnd = new Date(thresholdStart);
    thresholdEnd.setHours(23, 59, 59, 999);

    let expiringItems: {
      id: string;
      employee: any;
      expiryDate: Date | null;
      type: string;
      itemName: string;
    }[] = [];

    if (rule.category === "Driver Licence") {
      const items = await prisma.driverLicence.findMany({
        where: {
          // Only items expiring EXACTLY at the threshold (e.g., exactly 28 days from now)
          expiryDate: { gte: thresholdStart, lte: thresholdEnd },
          Employee: { companyId },
        },
        include: { Employee: { include: { User: true } } },
      });
      expiringItems.push(
        ...items.map((item: any) => ({
          id: item.id,
          employee: item.Employee,
          expiryDate: item.expiryDate,
          type: "Driver Licence",
          itemName: item.type || "Driver Licence",
        })),
      );
    }

    if (rule.category === "Training") {
      const items = await prisma.trainingRecord.findMany({
        where: {
          expiryDate: { gte: thresholdStart, lte: thresholdEnd },
          Employee: { companyId },
        },
        include: { Employee: { include: { User: true } }, Course: true },
      });
      expiringItems.push(
        ...items.map((item: any) => ({
          id: item.id,
          employee: item.Employee,
          expiryDate: item.expiryDate,
          type: "Training",
          itemName: item.course?.name || "Training",
        })),
      );
    }

    if (rule.category === "Employment Checks") {
      const items = await prisma.employmentCheck.findMany({
        where: {
          expiryDate: { gte: thresholdStart, lte: thresholdEnd },
          Employee: { companyId },
        },
        include: { Employee: { include: { User: true } } },
      });
      expiringItems.push(
        ...items.map((item: any) => ({
          id: item.id,
          employee: item.Employee,
          expiryDate: item.expiryDate,
          type: "Employment Check",
          itemName: item.typeOfCheck || "Employment Check",
        })),
      );
    }

    for (const item of expiringItems) {
      if (!item.expiryDate) continue; // ✅ skip if expiryDate is null

      const daysRemaining = Math.ceil(
        (item.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Check if we already sent a notification for this item at this threshold
      const existingNotification = await prisma.expiryNotificationLog.findFirst({
        where: {
          ruleId: rule.id,
          itemId: item.id,
          daysRemaining: rule.daysBefore, // Check based on the rule's threshold, not current days
        },
      });

      if (existingNotification) {
        console.log(
          `⏭️ Skipping ${item.type} for ${item.employee.User?.firstName} - already notified at ${rule.daysBefore} days threshold`,
        );
        continue;
      }

      const employeeName =
        `${item.employee.User?.firstName ?? "Unknown"} ${item.employee.User?.lastName ?? ""}`.trim();
      const recipients: string[] = [];

      if (rule.notifyAdmin) {
        const admins = await prisma.user.findMany({
          where: {
            role: "ADMIN",
            companyId: item.employee.companyId,
          },
        });
        recipients.push(...admins.map((admin: any) => admin.email));
      }

      if (rule.notifyManager && item.employee.managerId) {
        const manager = await prisma.user.findFirst({
          where: { id: item.employee.managerId, companyId },
        });
        if (manager?.email) recipients.push(manager.email);
      }

      if (rule.notifyEmployee && item.employee.User?.email) {
        recipients.push(item.employee.User.email);
      }

      if (recipients.length === 0) {
        console.log(`⚠️ No recipients for ${item.type} - ${employeeName}`);
        continue;
      }

      for (const recipient of recipients) {
        const { html, text } = renderPeopleCoreEmail({
          preheader: `${item.type} for ${employeeName} expires soon`,
          title: "Upcoming Expiry Alert",
          intro: [
            "Hello,",
            "This is a reminder that the following item is expiring soon:",
          ],
          sections: [
            {
              title: "Expiry Details",
              description: [
                `Employee: ${employeeName}`,
                `Type: ${item.type}`,
                `Item: ${item.itemName}`,
                `Expiry Date: ${item.expiryDate.toDateString()}`,
                `Days Remaining: ${daysRemaining} day(s)`,
              ],
            },
          ],
          outro: [
            "Please take action if required.",
            "Regards,",
            "PeopleCore HRIS",
          ],
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: recipient,
          subject: `Expiry Alert: ${item.type} for ${employeeName}`,
          html,
          text,
        });
        console.log(
          `✅ Sent expiry alert to ${recipient} for ${employeeName} (${item.type})`,
        );
      }

      // Log the notification to prevent duplicates
      await prisma.expiryNotificationLog.create({
        data: {
          companyId: item.employee.companyId,
          ruleId: rule.id,
          category: item.type,
          itemId: item.id,
          employeeId: item.employee.id,
          expiryDate: item.expiryDate,
          daysRemaining: rule.daysBefore,
        },
      });
      console.log(
        `📝 Logged notification for ${item.type} - ${employeeName} at ${rule.daysBefore} days threshold`,
      );
    }
  }

  // Handle Exit Interview Form scheduling
  const exitInterviewRule = expiryRules.find(
    (rule: any) => rule.category === "Exit Interview Forms",
  );
  if (exitInterviewRule) {
    console.log("Processing Exit Interview Form scheduling...");

    // Find offboarding records that need form invitations sent today
    const dueOffboardings = await prisma.employeeOffboarding.findMany({
      where: {
        sendForm: true,
        formTiming: "ON_DATE",
        completionStatus: "PENDING",
        // Only send if scheduled for today (in London timezone)
        scheduledSendAt: {
          not: null,
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today UTC
          lt: new Date(new Date().setHours(23, 59, 59, 999)), // End of today UTC
        },
        Employee: { companyId },
      },
      include: {
        Employee: {
          include: { User: true },
        },
        ExitInterviewFormTemplate: true,
      },
    });

    console.log(
      `Found ${dueOffboardings.length} offboarding records due for form invitations today`,
    );

    for (const offboarding of dueOffboardings) {
      try {
        // Double-check it's today in London timezone
        if (!isTodayInLondon(offboarding.scheduledSendAt!)) {
          console.log(
            `Skipping offboarding ${offboarding.id} - not scheduled for today`,
          );
          continue;
        }

        console.log(
          `Processing form invitation for offboarding ${offboarding.id}, scheduled for: ${offboarding.scheduledSendAt}`,
        );

        // Send the form invitation
        const emailSent = await sendExitInterviewFormInvite(offboarding.id);

        if (emailSent) {
          console.log(
            `✅ Sent form invitation for offboarding ${offboarding.id} to ${offboarding.Employee.User.email}`,
          );
        } else {
          console.log(
            `❌ Failed to send form invitation for offboarding ${offboarding.id}`,
          );
        }
      } catch (error) {
        console.error(
          `Failed to send form invitation for offboarding ${offboarding.id}:`,
          error,
        );
      }
    }
  }
}

/**
 * Process 90-day trial period reminders for all companies
 * Sends email notifications to manager/admin/both based on employee settings
 */
async function processTrialPeriodReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all employees with active trial periods who haven't been notified yet
  const employeesWithTrials = await prisma.employee.findMany({
    where: {
      ninetyDayTrialPeriod: true,
      trialPeriodEndDate: { not: null },
      trialNotificationSent: false,
      trialNotifyDaysBefore: { not: null },
      isActive: true,
    },
    include: {
      User: true,
      Company: true,
    },
  });

  let notificationsSent = 0;

  for (const employee of employeesWithTrials) {
    if (!employee.trialPeriodEndDate || !employee.trialNotifyDaysBefore) continue;

    // Calculate when notification should be sent
    const notifyDate = new Date(employee.trialPeriodEndDate);
    notifyDate.setDate(notifyDate.getDate() - employee.trialNotifyDaysBefore);
    notifyDate.setHours(0, 0, 0, 0);

    // Check if today is the notification date
    if (today.getTime() !== notifyDate.getTime()) continue;

    const employeeName = `${employee.User?.firstName ?? "Unknown"} ${employee.User?.lastName ?? ""}`.trim();
    const daysRemaining = employee.trialNotifyDaysBefore;
    const trialEndDate = employee.trialPeriodEndDate.toLocaleDateString("en-NZ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const recipients: string[] = [];
    const notifyRecipient = employee.trialNotifyRecipient || "MANAGER";

    // Get manager email if needed
    if (notifyRecipient === "MANAGER" || notifyRecipient === "BOTH") {
      if (employee.User?.managerId) {
        const manager = await prisma.user.findUnique({
          where: { id: employee.User.managerId },
          select: { email: true, firstName: true },
        });
        if (manager?.email) {
          recipients.push(manager.email);
        }
      }
    }

    // Get admin emails if needed
    if (notifyRecipient === "ADMIN" || notifyRecipient === "BOTH") {
      const admins = await prisma.user.findMany({
        where: {
          companyId: employee.companyId,
          role: { in: ["ADMIN", "SUPER_ADMIN"] },
        },
        select: { email: true },
      });
      recipients.push(...admins.map((a) => a.email));
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];

    if (uniqueRecipients.length === 0) {
      console.log(`⚠️ No recipients for trial period reminder - ${employeeName}`);
      continue;
    }

    // Send email to each recipient
    for (const recipient of uniqueRecipients) {
      try {
        const { html, text } = renderPeopleCoreEmail({
          preheader: `90-day trial period ending soon for ${employeeName}`,
          title: "90-Day Trial Period Reminder",
          intro: [
            "Hello,",
            `This is a reminder that the 90-day trial period for ${employeeName} is ending soon.`,
          ],
          sections: [
            {
              title: "Trial Period Details",
              description: [
                `Employee: ${employeeName}`,
                `Trial End Date: ${trialEndDate}`,
                `Days Remaining: ${daysRemaining} day(s)`,
              ],
            },
            {
              title: "Action Required",
              description: [
                "Please review the employee's performance and make a decision regarding their continued employment before the trial period ends.",
                "Under the NZ Employment Relations Act 2000, any decision to end employment must be communicated before the 90-day period expires.",
              ],
            },
          ],
          outro: [
            "Please take appropriate action.",
            "Regards,",
            "PeopleCore HRIS",
          ],
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: recipient,
          subject: `⚠️ Trial Period Ending: ${employeeName} - ${daysRemaining} days remaining`,
          html,
          text,
        });

        console.log(`✅ Sent trial period reminder to ${recipient} for ${employeeName}`);
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send trial period reminder to ${recipient}:`, error);
      }
    }

    // Mark notification as sent
    await prisma.employee.update({
      where: { id: employee.id },
      data: { trialNotificationSent: true },
    });
  }

  return notificationsSent;
}

// Shared processing logic for both GET and POST
async function processExpiryAlerts() {
  try {
    const companies = await prisma.company.findMany({ select: { id: true } });
    const companyIds = companies.map((c: any) => c.id);

    for (const id of companyIds) {
      await processCompany(id);
    }

    // Process trial period reminders (runs across all companies)
    const trialNotificationsSent = await processTrialPeriodReminders();
    console.log(`📧 Trial period reminders sent: ${trialNotificationsSent}`);

    return NextResponse.json({
      message: "Expiry alerts, form invitations, and trial reminders sent successfully.",
      companiesProcessed: companyIds.length,
      trialNotificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in processExpiryAlerts:", error);
    throw error; // Re-throw to be caught by GET/POST handlers
  }
}

// GET handler for Vercel Cron (Vercel only calls GET)
export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    if (!verifyCronSecret(req)) {
      return getUnauthorizedResponse();
    }

    return await processExpiryAlerts();
  } catch (error) {
    console.error("Error sending expiry alerts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST handler for manual/managed cron services
export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    if (!verifyCronSecret(req)) {
      return getUnauthorizedResponse();
    }

    return await processExpiryAlerts();
  } catch (error) {
    console.error("Error sending expiry alerts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
