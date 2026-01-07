import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission, hasEmployeeScreenPermission, UserWithProfile, PermissionAction, EMPLOYEE_PROFILE_SCREENS, EmployeeProfileScreen } from "@/lib/permissions";

/**
 * GET /api/permissions/check
 * 
 * Check if the current user has permission for a specific screen and action.
 * Used by client-side components to validate screen-specific access.
 * 
 * Query params:
 * - screen: The screen key to check (e.g., "employee-documents", "employees")
 * - action: The action to check (default: "read")
 * 
 * Returns:
 * - { allowed: boolean, screen: string, action: string }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const screen = searchParams.get("screen");
    const action = (searchParams.get("action") || "read") as PermissionAction;

    if (!screen) {
      return NextResponse.json(
        { error: "Missing required parameter: screen" },
        { status: 400 }
      );
    }

    // Validate action
    const validActions: PermissionAction[] = ["read", "edit", "delete", "approve"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch user with permission profile
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { PermissionProfile: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userWithProfile: UserWithProfile = {
      ...currentUser,
      permissionProfile: currentUser.PermissionProfile,
    };

    // Check if this is an employee profile screen
    const isEmployeeProfileScreen = (EMPLOYEE_PROFILE_SCREENS as readonly string[]).includes(screen);
    
    let allowed: boolean;
    
    if (isEmployeeProfileScreen) {
      // Use the specific employee screen permission check
      allowed = hasEmployeeScreenPermission(
        userWithProfile, 
        screen as EmployeeProfileScreen, 
        action
      );
    } else {
      // Use the general permission check
      allowed = hasPermission(userWithProfile, screen, action);
    }

    return NextResponse.json({
      allowed,
      screen,
      action,
      role: currentUser.role,
      hasPermissionProfile: !!currentUser.PermissionProfile,
    });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
