import { NextRequest, NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";

export async function POST(req: NextRequest) {
  try {
    await ensurePrismaConnected();
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { departments, locations, jobRoles } = await req.json();

    // Build where clause for employee query
    const whereClause: any = {
      companyId: session.user.companyId,
      status: "ACTIVE",
    };

    // Add department filter
    if (departments && departments.length > 0) {
      whereClause.departmentId = { in: departments };
    }

    // Add location filter
    if (locations && locations.length > 0) {
      whereClause.locationId = { in: locations };
    }

    // Add job role filter
    if (jobRoles && jobRoles.length > 0) {
      whereClause.jobRoleId = { in: jobRoles };
    }

    // Count matching employees
    const employeeCount = await prisma.employee.count({
      where: whereClause,
    });

    // Get details about the filters for better error messages
    const filterDetails = await Promise.all([
      departments && departments.length > 0
        ? prisma.department.findMany({
            where: { id: { in: departments }, companyId: session.user.companyId },
            select: { id: true, name: true },
          })
        : [],
      locations && locations.length > 0
        ? prisma.location.findMany({
            where: { id: { in: locations }, companyId: session.user.companyId },
            select: { id: true, name: true },
          })
        : [],
      jobRoles && jobRoles.length > 0
        ? prisma.jobRole.findMany({
            where: { id: { in: jobRoles }, companyId: session.user.companyId },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const [departmentNames, locationNames, jobRoleNames] = filterDetails;

    return NextResponse.json({
      valid: employeeCount > 0,
      employeeCount,
      details: {
        departments: departmentNames,
        locations: locationNames,
        jobRoles: jobRoleNames,
      },
    });
  } catch (error) {
    console.error("Error validating audience:", error);
    return NextResponse.json(
      { error: "Failed to validate audience" },
      { status: 500 }
    );
  }
}

