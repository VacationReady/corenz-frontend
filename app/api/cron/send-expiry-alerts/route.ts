import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend"; // assumes Resend configured

export async function POST() {
  try {
    const expiryRules = await prisma.expiryRule.findMany();
    const today = new Date();

    for (const rule of expiryRules) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + rule.daysBefore);

      let expiringItems: { employee: any; expiryDate: Date; type: string; itemName: string }[] = [];

      if (rule.category === "Driver Licence") {
        const items = await prisma.driverLicence.findMany({
          where: {
            expiryDate: { lte: targetDate, gte: today },
          },
          include: { employee: { include: { manager: true, user: true } } },
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
          include: { employee: { include: { manager: true, user: true } }, course: true },
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
          include: { employee: { include: { manager: true, user: true } } },
        });
        expiringItems.push(
          ...items.map((item) => ({
            employee: item.employee,
            expiryDate: item.expiryDate,
            type: "Employment Check",
            itemName: item.type || "Employment Check",
          }))
        );
      }

      // Send notifications for each expiring item
      for (const item of expiringItems) {
        const daysRemaining = Math.ceil((item.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const employeeName = `${item.employee.firstName} ${item.employee.lastName}`;

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

        if (rule.notifyManager && item.employee.manager?.email) {
          recipients.push(item.employee.manager.email);
        }

        if (rule.notifyEmployee && item.employee.user?.email) {
          recipients.push(item.employee.user.email);
        }

        for (const recipient of recipients) {
          await resend.emails.send({
            from: "notifications@corenz.co.nz",
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

    return NextResponse.json({ message: "Expiry alerts sent successfully." });
  } catch (error) {
    console.error("Error sending expiry alerts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
