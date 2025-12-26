import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const updateSchema = z.object({
  calendarEmployeeScope: z.enum(["OWN", "DEPARTMENT", "COMPANY"]).optional(),
  calendarManagerScope: z.enum(["DIRECT_REPORTS", "DEPARTMENT", "COMPANY"]).optional(),
});

/**
 * GET /api/settings/calendar-visibility
 * Fetch calendar visibility settings for the company
 * Any authenticated user can read settings
 */
export async function GET() {
  try {
    const session = await auth();
    const companyId = (session as any)?.user?.companyId as string | undefined;
    
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        calendarEmployeeScope: true,
        calendarManagerScope: true,
      },
    });

    // Return defaults if company not found (shouldn't happen)
    return NextResponse.json({
      calendarEmployeeScope: company?.calendarEmployeeScope ?? "DEPARTMENT",
      calendarManagerScope: company?.calendarManagerScope ?? "DEPARTMENT",
    });
  } catch (error) {
    console.error("[settings/calendar-visibility][GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/settings/calendar-visibility
 * Update calendar visibility settings
 * Admin only
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const companyId = (session as any)?.user?.companyId as string | undefined;
    const role = (session as any)?.user?.role as string | undefined;

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update calendar visibility settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid settings data", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { calendarEmployeeScope, calendarManagerScope } = parsed.data;

    // Build update data only with provided fields
    const updateData: any = {};
    if (calendarEmployeeScope) {
      updateData.calendarEmployeeScope = calendarEmployeeScope;
    }
    if (calendarManagerScope) {
      updateData.calendarManagerScope = calendarManagerScope;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No settings to update" }, { status: 400 });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    // Create audit log
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        actorId: (session as any)?.user?.id,
        companyId,
        action: "UPDATED",
        entityType: "COMPANY",
        entityId: companyId,
        metadata: {
          type: "CALENDAR_VISIBILITY_SETTINGS_UPDATED",
          changes: updateData,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[settings/calendar-visibility][PUT]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
