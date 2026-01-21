import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getRotaAccessInfo } from "@/lib/rota-access";

/**
 * GET /api/user/rota-access
 * Returns the current user's rota access level and group information.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessInfo = await getRotaAccessInfo(session.user.id);

    // For group managers, also fetch the list of employee IDs they can manage
    let managedEmployeeIds: string[] = [];
    if (accessInfo.accessLevel.type === "group_manager") {
      const managedGroupIds = accessInfo.managedGroups.map((g) => g.id);
      
      // Get all members from managed groups
      const members = await prisma.rotaGroupMember.findMany({
        where: {
          rotaGroupId: { in: managedGroupIds },
          isActive: true,
        },
        select: {
          employeeId: true,
        },
      });
      
      managedEmployeeIds = [...new Set(members.map((m) => m.employeeId))];
    }

    return NextResponse.json({
      accessLevel: accessInfo.accessLevel.type,
      managedGroups: accessInfo.managedGroups,
      memberGroups: accessInfo.memberGroups,
      // Convenience flag for sidebar visibility
      hasRotaAccess: accessInfo.accessLevel.type !== "none",
      // For group managers, list of employee IDs they can assign shifts to
      managedEmployeeIds: accessInfo.accessLevel.type === "group_manager" ? managedEmployeeIds : undefined,
    });
  } catch (error) {
    console.error("Error fetching rota access:", error);
    return NextResponse.json(
      { error: "Failed to fetch rota access" },
      { status: 500 }
    );
  }
}
