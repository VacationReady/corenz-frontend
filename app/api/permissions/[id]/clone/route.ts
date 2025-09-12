import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create permissions
    if (!hasPermission(session.user as any, "permissions", "edit")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get the original profile
    const originalProfile = await prisma.permissionProfile.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
    });

    if (!originalProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Generate a unique name for the clone
    let cloneName = `Copy of ${originalProfile.name}`;
    let counter = 1;

    // Check if the name already exists and increment counter if needed
    while (true) {
      const existingProfile = await prisma.permissionProfile.findFirst({
        where: {
          companyId: session.user.companyId,
          name: cloneName,
        },
      });

      if (!existingProfile) break;

      counter++;
      cloneName = `Copy of ${originalProfile.name} (${counter})`;
    }

    // Create the cloned profile
    const clonedProfile = await prisma.permissionProfile.create({
      data: {
        companyId: session.user.companyId,
        name: cloneName,
        description: originalProfile.description
          ? `Copy of ${originalProfile.description}`
          : `Copy of ${originalProfile.name}`,
        permissions: originalProfile.permissions as any,
        builtIn: false, // Cloned profiles are never built-in
      },
    });

    return NextResponse.json(clonedProfile, { status: 201 });
  } catch (error) {
    console.error("Error cloning permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
