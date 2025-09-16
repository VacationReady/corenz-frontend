import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch permission profiles
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await prisma.permissionProfile.findMany({
      where: {
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: [
        { builtIn: "desc" }, // Built-in profiles first
        { name: "asc" },
      ],
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Error fetching permission profiles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Create a new permission profile
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, permissions, scope, constraints } = body;

    // Validation
    if (!name || !permissions) {
      return NextResponse.json(
        { error: "Missing required fields: name, permissions" },
        { status: 400 },
      );
    }

    // Check for duplicate name
    const existingProfile = await prisma.permissionProfile.findFirst({
      where: {
        companyId: session.user.companyId,
        name,
      },
    });

    if (existingProfile) {
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

    const profile = await prisma.permissionProfile.create({
      data: {
        companyId: session.user.companyId,
        name,
        description,
        permissions,
        scope: scope || null,
        constraints: constraints || null,
        builtIn: false,
      },
    });

    // Create audit log entry
    await prisma.permissionProfileAudit.create({
      data: {
        profileId: profile.id,
        action: "created",
        changes: {
          name,
          description,
          permissions,
          scope,
          constraints,
        },
        changedBy: session.user.id,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("Error creating permission profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

