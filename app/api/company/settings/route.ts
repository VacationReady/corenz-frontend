import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/company/settings
 * 
 * Returns company-level settings for the current user's company.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Type assertion for fields that may not exist in Prisma types yet
    const companyWithConfig = company as typeof company & {
      leaveHoursEnabled?: boolean | null;
      defaultHoursPerDay?: any;
      leaveDisplayUnit?: string;
    };

    // Convert Decimal to number for JSON serialization
    const response = {
      id: company.id,
      name: company.name,
      publicHolidayRegion: company.publicHolidayRegion,
      calendarEmployeeScope: company.calendarEmployeeScope,
      defaultHoursPerDay: companyWithConfig.defaultHoursPerDay 
        ? Number(companyWithConfig.defaultHoursPerDay) 
        : 8,
      leaveDisplayUnit: companyWithConfig.leaveDisplayUnit ?? "DAYS",
      // Default leaveHoursEnabled to true if not set
      leaveHoursEnabled: companyWithConfig.leaveHoursEnabled ?? true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching company settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch company settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/company/settings
 * 
 * Updates company-level settings.
 * Only admins can update company settings.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")) {
      return NextResponse.json(
        { error: "Only admins can update company settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Build update data - only include fields that are provided
    const updateData: any = {};
    
    if (typeof body.leaveHoursEnabled === "boolean") {
      updateData.leaveHoursEnabled = body.leaveHoursEnabled;
    }
    
    if (typeof body.defaultHoursPerDay === "number") {
      updateData.defaultHoursPerDay = body.defaultHoursPerDay;
    }
    
    if (body.leaveDisplayUnit && ["DAYS", "HOURS", "BOTH"].includes(body.leaveDisplayUnit)) {
      updateData.leaveDisplayUnit = body.leaveDisplayUnit;
    }

    if (body.publicHolidayRegion !== undefined) {
      updateData.publicHolidayRegion = body.publicHolidayRegion;
    }

    if (body.calendarEmployeeScope !== undefined) {
      updateData.calendarEmployeeScope = body.calendarEmployeeScope;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedCompany = await (prisma.company as any).update({
      where: { id: session.user.companyId },
      data: updateData,
    });

    // Type assertion for fields that may not exist in Prisma types yet
    const companyWithConfig = updatedCompany as typeof updatedCompany & {
      leaveHoursEnabled?: boolean | null;
      defaultHoursPerDay?: any;
      leaveDisplayUnit?: string;
    };

    // Convert Decimal to number for JSON serialization
    const response = {
      id: updatedCompany.id,
      name: updatedCompany.name,
      publicHolidayRegion: updatedCompany.publicHolidayRegion,
      calendarEmployeeScope: updatedCompany.calendarEmployeeScope,
      defaultHoursPerDay: companyWithConfig.defaultHoursPerDay 
        ? Number(companyWithConfig.defaultHoursPerDay) 
        : 8,
      leaveDisplayUnit: companyWithConfig.leaveDisplayUnit ?? "DAYS",
      leaveHoursEnabled: companyWithConfig.leaveHoursEnabled ?? true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating company settings:", error);
    return NextResponse.json(
      { error: "Failed to update company settings" },
      { status: 500 }
    );
  }
}
