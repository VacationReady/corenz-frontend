import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend"; // assumes you have Resend configured

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
            expiryDate: {
              lte: targetDate,
              gte: today,
            },
          },
          include: { employee: { include: { manager: true } } },
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
            expiryDate: {
              lte: targetDate,
              gte: today,
            },
          },
          include: { employee: { include: { manager: true } }, course: true },
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
            expiryDate: {
              lte: targetDate,
              gte: today,
            },
          },
          include: { employee: { include: { manager: true } } },
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

      // Send notifications
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

        if (rule.notifyManager && item.employee.managerId) {
          const manager = await prisma.user.findUnique({
            where: { id: item.employee.managerId },
          });
          if (manager?.email) recipients.push(manager.email);
        }

        if (rule.notifyEmployee && item.employee.userId) {
          const user = await prisma.user.findUnique({
            where: { id: item.employee.userId },
          });
          if (user?.email) recipients.push(user.email);
        }

        for (const recipient of recipients) {
          await resend.emails.send({
            from: "notifications@corenz.co.nz",
            to: recipi
