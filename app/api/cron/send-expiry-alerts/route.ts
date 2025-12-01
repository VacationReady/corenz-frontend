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

// Shared processing logic for both GET and POST
async function processExpiryAlerts() {
  try {
    const companies = await prisma.company.findMany({ select: { id: true } });
    const companyIds = companies.map((c: any) => c.id);

    for (const id of companyIds) {
      await processCompany(id);
    }

    return NextResponse.json({
      message: "Expiry alerts and form invitations sent successfully.",
      companiesProcessed: companyIds.length,
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
