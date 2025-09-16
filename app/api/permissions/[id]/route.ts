import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission, validatePermissions } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    const dbProfile = await prisma.permissionProfile.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { User: true },
        },
      },
    });

    if (!dbProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = {
      ...dbProfile,
      permissions:
        typeof dbProfile.permissions === "string"
          ? JSON.parse(dbProfile.permissions as unknown as string)
          : dbProfile.permissions,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to edit permissions
    if (!hasPermission(session.user as any, "permissions", "edit")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name || !permissions) {
      return NextResponse.json(
        { error: "Name and permissions are required" },
        { status: 400 },
      );
    }

    // Validate permissions structure
    if (!validatePermissions(permissions)) {
      return NextResponse.json(
        { error: "Invalid permissions structure" },
        { status: 400 },
      );
    }

    // Check if profile exists and belongs to user's company
    const existingProfile = await prisma.permissionProfile.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Prevent editing built-in profiles
    if (existingProfile.builtIn) {
      return NextResponse.json(
        { error: "Cannot modify built-in profiles" },
        { status: 403 },
      );
    }

    // Check for duplicate name within company (excluding current profile)
    const duplicateProfile = await prisma.permissionProfile.findFirst({
      where: {
        companyId: session.user.companyId,
        name: name.trim(),
        id: { not: params.id },
      },
    });

    if (duplicateProfile) {
      return NextResponse.json(
        { error: "Profile name already exists" },
        { status: 400 },
      );
    }

    const updatedProfile = await prisma.permissionProfile.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim(),
        permissions,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to delete permissions
    if (!hasPermission(session.user as any, "permissions", "delete")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Check if profile exists and belongs to user's company
    const existingProfile = await prisma.permissionProfile.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { User: true },
        },
      },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Prevent deleting built-in profiles
    if (existingProfile.builtIn) {
      return NextResponse.json(
        { error: "Cannot delete built-in profiles" },
        { status: 403 },
      );
    }

    // Check if profile is in use
    if (existingProfile._count.User > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete profile that is assigned to users. Remove all assignments first.",
        },
        { status: 400 },
      );
    }

    await prisma.permissionProfile.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
