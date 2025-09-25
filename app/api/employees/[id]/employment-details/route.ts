import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs, diffRequiresReason } from "@/lib/audit-helpers";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        User: {
          select: {
            User: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        Department: {
          select: { id: true, name: true },
        },
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      employmentType: employee.employmentType,
      contractType: employee.contractType,
      siteLocation: employee.siteLocation,
      startDate: employee.startDate,
      department: employee.Department,
      manager: employee.User?.User,
      salaryAmount: employee.salaryAmount,
      hourlyRate: employee.hourlyRate,
      isActive: employee.isActive,
    });
  } catch (e: any) {
    console.error("[employment-details-get]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const updates: Record<string, any> = {};
    const keys = [
      "employmentType",
      "contractType",
      "siteLocation",
      "startDate",
      "departmentId",
      "managerId",
      "salaryAmount",
      "hourlyRate",
      "isActive",
    ] as const;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key as string];
      }
    }
    const reasons = (body as any).reasons as Record<string, string> | undefined;

    // Compute diffs and enforce reasons
    const allowed = keys;
    const diffs = computeDiffs(
      employee,
      { ...employee, ...updates },
      allowed,
    );

    if (diffs.length > 0) {
      const requiresReasons = diffs.some(diffRequiresReason);
      if (requiresReasons && !reasons) {
        return NextResponse.json(
          { error: "Reasons required for changes" },
          { status: 400 },
        );
      }
      try {
        await createAuditLogs({
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "employment-details",
          diffs,
          reasons: reasons || {},
          changedById: session.user.id,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    // Handle manager change: translate selected manager (employeeId) -> manager's userId
    let managerUserId: string | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(updates, "managerId")) {
      const managerEmployeeId = updates.managerId as string | null;
      delete updates.managerId; // not a column on Employee

      if (managerEmployeeId === "" || managerEmployeeId === null) {
        managerUserId = null; // clear manager
      } else if (typeof managerEmployeeId === "string") {
        const mgr = await prisma.employee.findFirst({
          where: { id: managerEmployeeId, companyId: session.user.companyId },
          select: { userId: true },
        });
        managerUserId = mgr?.userId ?? null;
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...updates,
        ...(managerUserId !== undefined
          ? { User: { update: { managerId: managerUserId } } }
          : {}),
        ...(updates.departmentId
          ? { User: { update: { departmentId: updates.departmentId } } }
          : {}),
      },
    });

    // If a manager was newly assigned, ensure they have MANAGER role and send notification
    if (managerUserId && typeof managerUserId === "string") {
      try {
        const [managerUser, updatedEmployee] = await Promise.all([
          prisma.user.findUnique({
            where: { id: managerUserId },
            select: { id: true, role: true, email: true, firstName: true, lastName: true, companyId: true },
          }),
          prisma.employee.findUnique({
            where: { id: employee.id },
            include: { User: { select: { id: true, firstName: true, lastName: true, email: true } } },
          }),
        ]);

        if (managerUser && managerUser.companyId === session.user.companyId) {
          // Auto-promote EMPLOYEE -> MANAGER and apply Manager permission profile if available
          if (managerUser.role === "EMPLOYEE") {
            const managerProfile = await prisma.permissionProfile.findFirst({
              where: { companyId: session.user.companyId, name: { equals: "Manager", mode: "insensitive" } },
              select: { id: true },
            });
            await prisma.user.update({
              where: { id: managerUser.id },
              data: {
                role: "MANAGER",
                ...(managerProfile ? { permissionProfileId: managerProfile.id } : {}),
              },
            });
          }

          // Send notification email to the new manager about the new report
          if (managerUser.email && updatedEmployee?.User) {
            const employeeName = `${updatedEmployee.User.firstName ?? ""} ${updatedEmployee.User.lastName ?? ""}`.trim() || updatedEmployee.User.email || "Employee";
            const baseUrl = getAppBaseUrl();
            const link = `${baseUrl}/employees/${employee.id}/overview`;
            const managerDisplayName = `${managerUser.firstName ?? ""} ${managerUser.lastName ?? ""}`.trim() || managerUser.email;

            const { html, text } = renderPeopleCoreEmail({
              preheader: `New report: ${employeeName}`,
              title: "You have a new direct report",
              intro: [
                `Hi ${managerDisplayName},`,
                `You have a new report: ${employeeName}.`,
                "If you do not think this is right please contact HR ASAP.",
              ],
              ctas: { label: "View Employee", href: link },
              outro: [
                "This is an automated notification from PeopleCore.",
              ],
            });

            await resend.emails.send({
              from: process.env.FROM_EMAIL || "noreply@peoplecore.co.nz",
              to: managerUser.email,
              subject: `You have a new report — ${employeeName}`,
              html,
              text,
            });
          }
        }
      } catch (notifyErr) {
        console.warn("Manager promotion/notification failed:", notifyErr);
        // non-fatal
      }
    }

    return NextResponse.json({ ok: true, employee: updated });
  } catch (e: any) {
    console.error("[employment-details-patch]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}


