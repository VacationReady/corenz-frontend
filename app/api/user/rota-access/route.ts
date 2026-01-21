import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
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

    return NextResponse.json({
      accessLevel: accessInfo.accessLevel.type,
      managedGroups: accessInfo.managedGroups,
      memberGroups: accessInfo.memberGroups,
      // Convenience flag for sidebar visibility
      hasRotaAccess: accessInfo.accessLevel.type !== "none",
    });
  } catch (error) {
    console.error("Error fetching rota access:", error);
    return NextResponse.json(
      { error: "Failed to fetch rota access" },
      { status: 500 }
    );
  }
}
