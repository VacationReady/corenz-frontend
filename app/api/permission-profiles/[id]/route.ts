import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch a specific permission profile
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.permissionProfile.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Permission profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT: Update a permission profile
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, permissions, scope, constraints } = body;

    // Check if profile exists and belongs to company
    const existingProfile = await prisma.permissionProfile.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Permission profile not found" },
        { status: 404 },
      );
    }

    // Don't allow editing built-in profiles
    if (existingProfile.builtIn) {
      return NextResponse.json(
        { error: "Cannot modify built-in permission profiles" },
        { status: 400 },
      );
    }

    // Validation
    if (!name || !permissions) {
      return NextResponse.json(
        { error: "Missing required fields: name, permissions" },
        { status: 400 },
      );
    }

    // Check for duplicate name (excluding current profile)
    const duplicateProfile = await prisma.permissionProfile.findFirst({
      where: {
        companyId: session.user.companyId,
        name,
        id: { not: params.id },
      },
    });

    if (duplicateProfile) {
      return NextResponse.json(
        { error: "A permission profile with this name already exists" },
        { status: 400 },
      );
    }

    // Validate constraints if provided
    if (constraints) {
      if (
        constraints.departmentIds &&
        Array.isArray(constraints.departmentIds)
      ) {
        const validDepartments = await prisma.department.count({
          where: {
            id: { in: constraints.departmentIds },
            companyId: session.user.companyId,
          },
        });
        if (validDepartments !== constraints.departmentIds.length) {
          return NextResponse.json(
            { error: "One or more invalid department IDs in constraints" },
            { status: 400 },
          );
        }
      }

      if (constraints.jobRoles && Array.isArray(constraints.jobRoles)) {
        const validJobRoles = await prisma.jobRole.count({
          where: {
            id: { in: constraints.jobRoles },
            companyId: session.user.companyId,
          },
        });
        if (validJobRoles !== constraints.jobRoles.length) {
          return NextResponse.json(
            { error: "One or more invalid job role IDs in constraints" },
            { status: 400 },
          );
        }
      }
    }

    // Track changes for audit
    const changes: any = {};
    if (existingProfile.name !== name)
      changes.name = { from: existingProfile.name, to: name };
    if (existingProfile.description !== description)
      changes.description = {
        from: existingProfile.description,
        to: description,
      };
    if (
      JSON.stringify(existingProfile.permissions) !==
      JSON.stringify(permissions)
    ) {
      changes.permissions = {
        from: existingProfile.permissions,
        to: permissions,
      };
    }
    if (existingProfile.scope !== scope)
      changes.scope = { from: existingProfile.scope, to: scope };
    if (
      JSON.stringify(existingProfile.constraints) !==
      JSON.stringify(constraints)
    ) {
      changes.constraints = {
        from: existingProfile.constraints,
        to: constraints,
      };
    }

    const updatedProfile = await prisma.permissionProfile.update({
      where: { id: params.id },
      data: {
        name,
        description,
        permissions,
        scope: scope || null,
        constraints: constraints || null,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    // Create audit log entry if there were changes
    if (Object.keys(changes).length > 0) {
      await prisma.permissionProfileAudit.create({
        data: {
          profileId: updatedProfile.id,
          action: "updated",
          changes,
          changedBy: session.user.id,
        },
      });
    }

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: Delete a permission profile
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if profile exists and belongs to company
    const existingProfile = await prisma.permissionProfile.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Permission profile not found" },
        { status: 404 },
      );
    }

    // Don't allow deleting built-in profiles
    if (existingProfile.builtIn) {
      return NextResponse.json(
        { error: "Cannot delete built-in permission profiles" },
        { status: 400 },
      );
    }

    // Check if profile is in use
    if (existingProfile._count.users > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete permission profile that is assigned to ${existingProfile._count.users} user(s)`,
        },
        { status: 400 },
      );
    }

    // Create audit log entry before deletion
    await prisma.permissionProfileAudit.create({
      data: {
        profileId: existingProfile.id,
        action: "deleted",
        changes: {
          name: existingProfile.name,
          description: existingProfile.description,
          permissions: existingProfile.permissions,
          scope: existingProfile.scope,
          constraints: existingProfile.constraints,
        },
        changedBy: session.user.id,
      },
    });

    await prisma.permissionProfile.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Permission profile deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
