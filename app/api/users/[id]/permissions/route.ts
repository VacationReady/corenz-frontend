import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  resolvePermissions,
  validatePermissions,
} from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view permissions
    if (!hasPermission(session.user as any, "permissions", "read")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get user with their current permission profile
    const { id } = await context.params;
    const user = await prisma.user.findFirst({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
      include: {
        PermissionProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get effective permissions
    const effectivePermissions = resolvePermissions(user as any);

    // Get audit trail
    const auditTrail = await prisma.permissionAudit.findMany({
      where: { employeeId: id },
      select: {
        id: true,
        changedAt: true,
        note: true,
        oldPermissions: true,
        newPermissions: true,
        User_PermissionAudit_changedByIdToUser: {
          select: { id: true, name: true, email: true },
        },
        PermissionProfile_PermissionAudit_oldProfileIdToPermissionProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
        PermissionProfile_PermissionAudit_newProfileIdToPermissionProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
      },
      orderBy: { changedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissionProfile: user.PermissionProfile,
      },
      effectivePermissions,
      auditTrail,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage permissions
    if (!hasPermission(session.user as any, "permissions", "edit")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { permissionProfileId, note, customPermissions } = body as {
      permissionProfileId?: string | null;
      note?: string;
      customPermissions?: Record<string, ("read" | "edit" | "delete")[]>;
    };

    // Validate that user exists and belongs to the same company
    const { id } = await context.params;
    const user = await prisma.user.findFirst({
      where: {
        id: id,
        companyId: session.user.companyId,
      },
      include: {
        PermissionProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If setting a custom profile, validate it exists and belongs to the company
    if (permissionProfileId) {
      const profile = await prisma.permissionProfile.findFirst({
        where: {
          id: permissionProfileId,
          companyId: session.user.companyId,
        },
      });

      if (!profile) {
        return NextResponse.json(
          { error: "Permission profile not found" },
          { status: 404 },
        );
      }
    }

    // Validate custom permissions shape if provided
    if (customPermissions && !validatePermissions(customPermissions as any)) {
      return NextResponse.json(
        { error: "Invalid custom permissions structure" },
        { status: 400 },
      );
    }

    // Get old permissions for audit
    const oldPermissions = user.PermissionProfile
      ? typeof user.PermissionProfile.permissions === "string"
        ? JSON.parse(user.PermissionProfile.permissions as unknown as string)
        : (user.PermissionProfile.permissions as any)
      : null;

    // Update user's permission profile and optional per-user overrides (stored via dedicated per-user profile)
    // Strategy: If customPermissions provided, create or update a company-scoped PermissionProfile named per-user and link it.
    let profileIdToAssign: string | null | undefined = permissionProfileId ?? undefined;

    if (customPermissions) {
      const perUserProfileName = `USER_${id}_OVERRIDES`;
      const existingPerUserProfile = await prisma.permissionProfile.findFirst({
        where: { companyId: session.user.companyId, name: perUserProfileName },
      });

      if (existingPerUserProfile) {
        await prisma.permissionProfile.update({
          where: { id: existingPerUserProfile.id },
          data: { permissions: customPermissions, builtIn: false, updatedAt: new Date() },
        });
        profileIdToAssign = existingPerUserProfile.id;
      } else {
        const created = await prisma.permissionProfile.create({
          data: {
            id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            companyId: session.user.companyId,
            name: perUserProfileName,
            description: `Per-user overrides for ${id}`,
            permissions: customPermissions,
            builtIn: false,
            updatedAt: new Date(),
          },
        });
        profileIdToAssign = created.id;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        permissionProfileId:
          profileIdToAssign !== undefined ? profileIdToAssign : permissionProfileId || null,
      },
      include: {
        PermissionProfile: true,
      },
    });

    // Get new permissions for audit
    const newPermissions = updatedUser.PermissionProfile
      ? typeof updatedUser.PermissionProfile.permissions === "string"
        ? JSON.parse(
            updatedUser.PermissionProfile.permissions as unknown as string,
          )
        : (updatedUser.PermissionProfile.permissions as any)
      : null;

    // Create audit log entry
    await prisma.permissionAudit.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeId: id,
        changedById: session.user.id,
        oldProfileId: user.permissionProfileId,
        newProfileId:
          profileIdToAssign !== undefined ? profileIdToAssign : permissionProfileId,
        oldPermissions: oldPermissions
          ? JSON.parse(JSON.stringify(oldPermissions))
          : undefined,
        newPermissions: newPermissions
          ? JSON.parse(JSON.stringify(newPermissions))
          : undefined,
        note: note?.trim(),
      },
    });

    // Get effective permissions for response
    const effectivePermissions = resolvePermissions(updatedUser as any);

    // Get audit trail
    const auditTrail = await prisma.permissionAudit.findMany({
      where: { employeeId: id },
      select: {
        id: true,
        changedAt: true,
        note: true,
        oldPermissions: true,
        newPermissions: true,
        User_PermissionAudit_changedByIdToUser: {
          select: { id: true, name: true, email: true },
        },
        PermissionProfile_PermissionAudit_oldProfileIdToPermissionProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
        PermissionProfile_PermissionAudit_newProfileIdToPermissionProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
      },
      orderBy: { changedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        permissionProfile: updatedUser.PermissionProfile,
      },
      effectivePermissions,
      auditTrail,
    });
  } catch (error) {
    console.error("Error updating user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
