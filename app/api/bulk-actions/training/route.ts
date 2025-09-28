import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import crypto from "crypto";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import {
  createAuditLogs,
  formatDiffsForFormData,
} from "@/lib/audit-helpers";

const payloadSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  courseId: z.string().uuid(),
  providerId: z.string().uuid(),
  dateCompleted: z.string().min(1),
  expiryDate: z.string().min(1).optional(),
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
    const { employeeIds, courseId, providerId, dateCompleted, expiryDate, reason } = body;

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { companyId: session.user.companyId },
          { companyId: null },
        ],
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const provider = await prisma.trainingProvider.findFirst({
      where: { id: providerId, companyId: session.user.companyId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const completedDate = new Date(dateCompleted);
    if (Number.isNaN(completedDate.valueOf())) {
      return NextResponse.json({ error: "Invalid completion date" }, { status: 400 });
    }

    const expiry = expiryDate ? new Date(expiryDate) : null;
    if (expiry && Number.isNaN(expiry.valueOf())) {
      return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
    }

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: session.user.companyId },
      select: { id: true },
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
        await prisma.trainingRecord.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: employee.id,
            courseId,
            providerId,
            dateCompleted: completedDate,
            expiryDate: expiry ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        const diffs = formatDiffsForFormData({
          courseId,
          providerId,
          dateCompleted: completedDate.toISOString(),
          expiryDate: expiry ? expiry.toISOString() : null,
        });

        const reasons = diffs.reduce<Record<string, string>>((acc, diff) => {
          acc[diff.field] = reason;
          return acc;
        }, {});

        await createAuditLogs({
          companyId: session.user.companyId,
          employeeId: employee.id,
          section: "training",
          diffs,
          reasons,
          changedById: session.user.id,
        });
      } catch (error: any) {
        console.error("[bulk-actions/training]", error);
        failures.push({
          employeeId: employee.id,
          error: error?.message || "Failed to create training record",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: employeeIds.length,
      failures,
    });
  } catch (error: any) {
    console.error("[bulk-actions/training]", error);
    return NextResponse.json(
      { error: error?.message || "Unable to process bulk training action" },
      { status: 400 },
    );
  }
}
