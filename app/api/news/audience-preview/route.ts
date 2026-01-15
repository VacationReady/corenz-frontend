export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";

/**
 * POST /api/news/audience-preview
 * 
 * Returns the count of users who would see a news post based on the provided
 * audience filters and match mode.
 * 
 * Request body:
 * {
 *   audience: { type?: "all", departments?: string[], roles?: string[], locations?: string[] },
 *   matchMode: "ALL" | "ANY"
 * }
 * 
 * Response:
 * {
 *   count: number,
 *   breakdown: { departments: number, roles: number, locations: number }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        PermissionProfile: true,
      },
    });

    if (!user || !hasPermission(user as any, "news", "edit")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { audience, matchMode = "ALL" } = body;

    // If targeting all users, return total active user count
    if (audience?.type === "all" || !audience) {
      const count = await prisma.user.count({
        where: {
          companyId,
          isActivated: true,
        },
      });
      return NextResponse.json({
        count,
        breakdown: { departments: count, roles: count, locations: count },
        matchMode: "ALL",
      });
    }

    const departments = audience.departments || [];
    const roles = audience.roles || [];
    const locations = audience.locations || [];

    // If no filters selected, return all users
    if (departments.length === 0 && roles.length === 0 && locations.length === 0) {
      const count = await prisma.user.count({
        where: {
          companyId,
          isActivated: true,
        },
      });
      return NextResponse.json({
        count,
        breakdown: { departments: count, roles: count, locations: count },
        matchMode,
      });
    }

    // Get department IDs
    const departmentIds = departments.length > 0
      ? (await prisma.department.findMany({
          where: { companyId, name: { in: departments } },
          select: { id: true },
        })).map(d => d.id)
      : [];

    // Get role IDs
    const roleIds = roles.length > 0
      ? (await prisma.jobRole.findMany({
          where: { companyId, name: { in: roles } },
          select: { id: true },
        })).map(r => r.id)
      : [];

    // Get location IDs
    const locationIds = locations.length > 0
      ? (await prisma.location.findMany({
          where: { companyId, name: { in: locations } },
          select: { id: true },
        })).map(l => l.id)
      : [];

    // Get breakdown counts for each dimension
    const departmentUserCount = departmentIds.length > 0
      ? await prisma.user.count({
          where: {
            companyId,
            isActivated: true,
            OR: [
              { departmentId: { in: departmentIds } },
              { Employee: { departmentId: { in: departmentIds } } },
            ],
          },
        })
      : 0;

    const roleUserCount = roleIds.length > 0
      ? await prisma.user.count({
          where: {
            companyId,
            isActivated: true,
            OR: [
              { jobRoleId: { in: roleIds } },
              { Employee: { jobRoleId: { in: roleIds } } },
            ],
          },
        })
      : 0;

    const locationUserCount = locationIds.length > 0
      ? await prisma.user.count({
          where: {
            companyId,
            isActivated: true,
            Employee: { locationId: { in: locationIds } },
          },
        })
      : 0;

    // Build the main query based on match mode
    let whereClause: any;

    if (matchMode === "ANY") {
      // ANY mode: user matches if they match at least one populated dimension
      const orConditions: any[] = [];

      if (departmentIds.length > 0) {
        orConditions.push(
          { departmentId: { in: departmentIds } },
          { Employee: { departmentId: { in: departmentIds } } }
        );
      }

      if (roleIds.length > 0) {
        orConditions.push(
          { jobRoleId: { in: roleIds } },
          { Employee: { jobRoleId: { in: roleIds } } }
        );
      }

      if (locationIds.length > 0) {
        orConditions.push({ Employee: { locationId: { in: locationIds } } });
      }

      whereClause = {
        companyId,
        isActivated: true,
        OR: orConditions,
      };
    } else {
      // ALL mode (default): user must match every populated dimension
      const andConditions: any[] = [];

      if (departmentIds.length > 0) {
        andConditions.push({
          OR: [
            { departmentId: { in: departmentIds } },
            { Employee: { departmentId: { in: departmentIds } } },
          ],
        });
      }

      if (roleIds.length > 0) {
        andConditions.push({
          OR: [
            { jobRoleId: { in: roleIds } },
            { Employee: { jobRoleId: { in: roleIds } } },
          ],
        });
      }

      if (locationIds.length > 0) {
        andConditions.push({
          Employee: { locationId: { in: locationIds } },
        });
      }

      whereClause = {
        companyId,
        isActivated: true,
        AND: andConditions,
      };
    }

    const count = await prisma.user.count({ where: whereClause });

    return NextResponse.json({
      count,
      breakdown: {
        departments: departmentUserCount,
        roles: roleUserCount,
        locations: locationUserCount,
      },
      matchMode,
    });
  } catch (error) {
    console.error("Error calculating audience preview:", error);
    return NextResponse.json(
      { error: "Failed to calculate audience preview" },
      { status: 500 }
    );
  }
}
