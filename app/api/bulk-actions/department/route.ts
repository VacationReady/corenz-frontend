import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { computeDiffs, createAuditLogs } from "@/lib/audit-helpers";

const payloadSchema = z
  .object({
    employeeIds: z.array(z.string().uuid()).min(1),
    departmentId: z.string().uuid().optional(),
    jobRoleId: z.string().uuid().optional(),
    reason: z.string().trim().min(3),
  })
  .refine((value) => value.departmentId || value.jobRoleId, {
    message: "Provide a new department or job role",
    path: ["departmentId"],
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

    const json = await request.json();
    const body = payloadSchema.parse(json);

    const { employeeIds, departmentId, jobRoleId, reason } = body;

    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        companyId: session.user.companyId,
      },
      include: {
        User: { select: { id: true } },
      },
    });

    const foundIds = new Set(employees.map((employee) => employee.id));
    const failures: Array<{ employeeId: string; error: string }> = [];

    for (const targetId of employeeIds) {
      if (!foundIds.has(targetId)) {
        failures.push({ employeeId: targetId, error: "Employee not found" });
      }
    }

    for (const employee of employees) {
      try {
        const before = {
          departmentId: employee.departmentId,
          jobRoleId: employee.jobRoleId,
        };
        const after = {
          departmentId: departmentId ?? employee.departmentId,
          jobRoleId: jobRoleId ?? employee.jobRoleId,
        };

        const diffs = computeDiffs(before, after, [
          "departmentId",
          "jobRoleId",
        ]);

        if (diffs.length === 0) {
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.employee.update({
            where: { id: employee.id },
            data: {
              departmentId: departmentId ?? employee.departmentId,
              jobRoleId: jobRoleId ?? employee.jobRoleId,
            },
          });

          await tx.user.update({
            where: { id: employee.User.id },
            data: {
              departmentId: departmentId ?? employee.departmentId,
              jobRoleId: jobRoleId ?? employee.jobRoleId,
            },
          });
        });

        const reasonMap = diffs.reduce<Record<string, string>>((acc, diff) => {
          acc[diff.field] = reason;
          return acc;
        }, {});

        await createAuditLogs({
          companyId: session.user.companyId,
          employeeId: employee.id,
          section: "employment-details",
          diffs,
          reasons: reasonMap,
          changedById: session.user.id,
        });
      } catch (error: any) {
        console.error("[bulk-actions/department]", error);
        failures.push({
          employeeId: employee.id,
          error: error?.message || "Failed to update employee",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: employeeIds.length,
      failures,
    });
  } catch (error: any) {
    console.error("[bulk-actions/department]", error);
    return NextResponse.json(
      { error: error?.message || "Unable to process bulk department change" },
      { status: 400 },
    );
  }
}
