import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { computeDiffs, createAuditLogs } from "@/lib/audit-helpers";

const payloadSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  mode: z.enum(["percent", "flat"]),
  amount: z.number(),
  reason: z.string().trim().min(3),
});

export async function POST(request: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = payloadSchema.parse(await request.json());
    const { employeeIds, mode, amount, reason } = body;

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: session.user.companyId },
      select: {
        id: true,
        companyId: true,
        salaryAmount: true,
        hourlyRate: true,
      },
    });

    const failures: Array<{ employeeId: string; error: string }> = [];
    const foundIds = new Set(employees.map((employee) => employee.id));

    for (const targetId of employeeIds) {
      if (!foundIds.has(targetId)) {
        failures.push({ employeeId: targetId, error: "Employee not found" });
      }
    }

    const multiplier = mode === "percent"
      ? new Prisma.Decimal(1).add(new Prisma.Decimal(amount).div(100))
      : null;
    const flatAdjustment = mode === "flat" ? new Prisma.Decimal(amount) : null;

    const adjustValue = (value: Prisma.Decimal | null) => {
      if (value === null) return null;
      if (mode === "percent" && multiplier) {
        const updated = value.mul(multiplier);
        return new Prisma.Decimal(updated.toFixed(2));
      }
      if (mode === "flat" && flatAdjustment) {
        const updated = value.add(flatAdjustment);
        return new Prisma.Decimal(updated.toFixed(2));
      }
      return value;
    };

    // 2080 working hours per year (40 hours/week × 52 weeks)
    const HOURS_PER_YEAR = new Prisma.Decimal(2080);

    for (const employee of employees) {
      try {
        const before = {
          salaryAmount: employee.salaryAmount,
          hourlyRate: employee.hourlyRate,
        };

        const after = { ...before };

        // Always update both salary and hourly together
        // If employee has a salary, adjust it and calculate hourly from it
        if (employee.salaryAmount !== null) {
          after.salaryAmount = adjustValue(employee.salaryAmount);
          if (after.salaryAmount !== null) {
            // Calculate hourly rate from annual salary
            after.hourlyRate = new Prisma.Decimal(
              after.salaryAmount.div(HOURS_PER_YEAR).toFixed(2)
            );
          }
        } 
        // If employee only has hourly rate, adjust it and calculate salary from it
        else if (employee.hourlyRate !== null) {
          after.hourlyRate = adjustValue(employee.hourlyRate);
          if (after.hourlyRate !== null) {
            // Calculate annual salary from hourly rate
            after.salaryAmount = new Prisma.Decimal(
              after.hourlyRate.mul(HOURS_PER_YEAR).toFixed(2)
            );
          }
        } else {
          // Employee has neither salary nor hourly rate set
          failures.push({
            employeeId: employee.id,
            error: "Neither salary nor hourly rate is set",
          });
          continue;
        }

        const diffs = computeDiffs(before, after, [
          "salaryAmount",
          "hourlyRate",
        ]);

        if (diffs.length === 0) {
          continue;
        }

        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            salaryAmount: after.salaryAmount,
            hourlyRate: after.hourlyRate,
          },
        });

        const reasons = diffs.reduce<Record<string, string>>((acc, diff) => {
          acc[diff.field] = reason;
          return acc;
        }, {});

        await createAuditLogs({
          companyId: session.user.companyId,
          employeeId: employee.id,
          section: "employment-details",
          diffs,
          reasons,
          changedById: session.user.id,
        });
      } catch (error: any) {
        console.error("[bulk-actions/compensation]", error);
        failures.push({
          employeeId: employee.id,
          error: error?.message || "Failed to update compensation",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: employeeIds.length,
      failures,
    });
  } catch (error: any) {
    console.error("[bulk-actions/compensation]", error);
    return NextResponse.json(
      { error: error?.message || "Unable to process bulk compensation change" },
      { status: 400 },
    );
  }
}
