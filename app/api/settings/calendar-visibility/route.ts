import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const updateSchema = z.object({
  calendarEmployeeScope: z.enum(["OWN", "DEPARTMENT", "COMPANY"]).optional(),
  calendarManagerScope: z.enum(["DIRECT_REPORTS", "DEPARTMENT", "COMPANY"]).optional(),
});

// Type for raw query result
interface CompanyVisibilityRow {
  calendarEmployeeScope: string | null;
  calendarManagerScope: string | null;
}

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

    // Use raw query to handle case where Prisma client hasn't been regenerated yet
    // This will return null for the columns if migration hasn't run, or the values if it has
    let calendarEmployeeScope = "DEPARTMENT";
    let calendarManagerScope = "DEPARTMENT";
    
    try {
      const result = await prisma.$queryRaw<CompanyVisibilityRow[]>`
        SELECT "calendarEmployeeScope", "calendarManagerScope" 
        FROM "Company" 
        WHERE id = ${companyId}
      `;
      if (result && result.length > 0) {
        calendarEmployeeScope = result[0].calendarEmployeeScope ?? "DEPARTMENT";
        calendarManagerScope = result[0].calendarManagerScope ?? "DEPARTMENT";
      }
    } catch {
      // Columns don't exist yet (migration not applied), use defaults
      console.log("[settings/calendar-visibility] Using default settings (migration may not be applied yet)");
    }

    return NextResponse.json({
      calendarEmployeeScope,
      calendarManagerScope,
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

    if (!calendarEmployeeScope && !calendarManagerScope) {
      return NextResponse.json({ error: "No settings to update" }, { status: 400 });
    }

    // Use raw SQL to update - handles case where Prisma client hasn't been regenerated
    const updateParts: string[] = [];
    const updateData: Record<string, string> = {};
    
    if (calendarEmployeeScope) {
      updateParts.push(`"calendarEmployeeScope" = '${calendarEmployeeScope}'::"CalendarEmployeeScope"`);
      updateData.calendarEmployeeScope = calendarEmployeeScope;
    }
    if (calendarManagerScope) {
      updateParts.push(`"calendarManagerScope" = '${calendarManagerScope}'::"CalendarManagerScope"`);
      updateData.calendarManagerScope = calendarManagerScope;
    }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Company" SET ${updateParts.join(", ")} WHERE id = $1`,
        companyId
      );
    } catch (updateError) {
      console.error("[settings/calendar-visibility] Update failed - migration may not be applied:", updateError);
      return NextResponse.json(
        { error: "Calendar visibility settings not available. Please ensure database migration has been applied." },
        { status: 503 }
      );
    }

    // Create audit log - using BRANDING_CONFIG as the closest entity type for company settings
    await prisma.globalAuditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        actorId: (session as any)?.user?.id,
        companyId,
        action: "UPDATED",
        entityType: "BRANDING_CONFIG",
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
