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
  targets: z.array(z.enum(["salary", "hourly"])).min(1),
  reason: z.string().trim().min(3),
});

export async function POST(request: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(["ADMIN", "SUPER_ADMIN"] as const).includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = payloadSchema.parse(await request.json());
    const { employeeIds, mode, amount, targets, reason } = body;

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

    for (const employee of employees) {
      try {
        const before = {
          salaryAmount: employee.salaryAmount,
          hourlyRate: employee.hourlyRate,
        };

        const after = { ...before };

        if (targets.includes("salary")) {
          if (!employee.salaryAmount) {
            failures.push({
              employeeId: employee.id,
              error: "Salary amount is not set",
            });
            continue;
          }
          after.salaryAmount = adjustValue(employee.salaryAmount);
        }

        if (targets.includes("hourly")) {
          if (!employee.hourlyRate) {
            failures.push({
              employeeId: employee.id,
              error: "Hourly rate is not set",
            });
            continue;
          }
          after.hourlyRate = adjustValue(employee.hourlyRate);
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
            updatedAt: new Date(),
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
