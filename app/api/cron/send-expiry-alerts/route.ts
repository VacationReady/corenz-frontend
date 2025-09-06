import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend"; // assumes Resend configured
import { sendExitInterviewFormInvite } from "@/lib/email/send";
import { isTodayInLondon } from "@/lib/time";

export async function POST() {
  try {
    const expiryRules = await prisma.expiryRule.findMany();
    const today = new Date();

    for (const rule of expiryRules) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + rule.daysBefore);

      let expiringItems: {
        employee: any;
        expiryDate: Date | null;
        type: string;
        itemName: string;
      }[] = [];

      if (rule.category === "Driver Licence") {
        const items = await prisma.driverLicence.findMany({
          where: {
            expiryDate: { lte: targetDate, gte: today },
          },
          include: { employee: { include: { user: true } } },
        });
        expiringItems.push(
          ...items.map((item) => ({
            employee: item.employee,
            expiryDate: item.expiryDate,
            type: "Driver Licence",
            itemName: item.type || "Driver Licence",
          }))
        );
      }

      if (rule.category === "Training") {
        const items = await prisma.trainingRecord.findMany({
          where: {
            expiryDate: { lte: targetDate, gte: today },
          },
          include: { employee: { include: { user: true } }, course: true },
        });
        expiringItems.push(
          ...items.map((item) => ({
            employee: item.employee,
            expiryDate: item.expiryDate,
            type: "Training",
            itemName: item.course?.name || "Training",
          }))
        );
      }

      if (rule.category === "Employment Checks") {
        const items = await prisma.employmentCheck.findMany({
          where: {
            expiryDate: { lte: targetDate, gte: today },
          },
          include: { employee: { include: { user: true } } },
        });
        expiringItems.push(
          ...items.map((item) => ({
            employee: item.employee,
            expiryDate: item.expiryDate,
            type: "Employment Check",
            itemName: item.typeOfCheck || "Employment Check",
          }))
        );
      }

      for (const item of expiringItems) {
        if (!item.expiryDate) continue; // ✅ skip if expiryDate is null

        const daysRemaining = Math.ceil(
          (item.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const employeeName = `${item.employee.user?.firstName ?? 'Unknown'} ${item.employee.user?.lastName ?? ''}`.trim();
        const recipients: string[] = [];

        if (rule.notifyAdmin) {
          const admins = await prisma.user.findMany({
            where: {
              role: "ADMIN",
              companyId: item.employee.companyId,
            },
          });
          recipients.push(...admins.map((admin) => admin.email));
        }

        if (rule.notifyManager && item.employee.managerId) {
          const manager = await prisma.user.findUnique({
            where: { id: item.employee.managerId },
          });
          if (manager?.email) recipients.push(manager.email);
        }

        if (rule.notifyEmployee && item.employee.user?.email) {
          recipients.push(item.employee.user.email);
        }

        for (const recipient of recipients) {
          await resend.emails.send({
            from: "onboarding@resend.dev",
            to: recipient,
            subject: `Expiry Alert: ${item.type} for ${employeeName}`,
            html: `
              <p>Hello,</p>
              <p>This is a reminder that the following item is expiring soon:</p>
              <ul>
                <li><strong>Employee:</strong> ${employeeName}</li>
                <li><strong>Type:</strong> ${item.type}</li>
                <li><strong>Item:</strong> ${item.itemName}</li>
                <li><strong>Expiry Date:</strong> ${item.expiryDate.toDateString()}</li>
                <li><strong>Days Remaining:</strong> ${daysRemaining} day(s)</li>
              </ul>
              <p>Please take action if required.</p>
              <p>Regards,<br/>CoreNZ HRIS</p>
            `,
          });
          console.log(`✅ Sent expiry alert to ${recipient} for ${employeeName} (${item.type})`);
        }
      }
    }

    // Handle Exit Interview Form scheduling
    const exitInterviewRule = expiryRules.find(rule => rule.category === "Exit Interview Forms");
    if (exitInterviewRule) {
      console.log("Processing Exit Interview Form scheduling...");

      // Find offboarding records that need form invitations sent today
      const dueOffboardings = await prisma.employeeOffboarding.findMany({
        where: {
          sendForm: true,
          formTiming: 'ON_DATE',
          completionStatus: 'PENDING',
          // Only send if scheduled for today (in London timezone)
          scheduledSendAt: {
            not: null,
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today UTC
            lt: new Date(new Date().setHours(23, 59, 59, 999)) // End of today UTC
          }
        },
        include: {
          employee: {
            include: { user: true }
          },
          formTemplate: true
        }
      });

      console.log(`Found ${dueOffboardings.length} offboarding records due for form invitations today`);

      for (const offboarding of dueOffboardings) {
        try {
          // Double-check it's today in London timezone
          if (!isTodayInLondon(offboarding.scheduledSendAt!)) {
            console.log(`Skipping offboarding ${offboarding.id} - not scheduled for today`);
            continue;
          }

          console.log(`Processing form invitation for offboarding ${offboarding.id}, scheduled for: ${offboarding.scheduledSendAt}`);

          // Send the form invitation
          const emailSent = await sendExitInterviewFormInvite(offboarding.id);

          if (emailSent) {
            console.log(`✅ Sent form invitation for offboarding ${offboarding.id} to ${offboarding.employee.user.email}`);
          } else {
            console.log(`❌ Failed to send form invitation for offboarding ${offboarding.id}`);
          }

        } catch (error) {
          console.error(`Failed to send form invitation for offboarding ${offboarding.id}:`, error);
        }
      }
    }

    return NextResponse.json({ message: "Expiry alerts and form invitations sent successfully." });
  } catch (error) {
    console.error("Error sending expiry alerts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
