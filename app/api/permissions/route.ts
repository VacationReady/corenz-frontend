import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  validatePermissions,
  DEFAULT_PERMISSIONS,
} from "@/lib/permissions";
import { PermissionProfile } from "@prisma/client";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const filterType = searchParams.get("filterType") || "all";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      companyId: session.user.companyId,
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Add type filter
    if (filterType === "builtin") {
      whereClause.builtIn = true;
    } else if (filterType === "custom") {
      whereClause.builtIn = false;
    }

    // Build orderBy clause
    const orderBy: any[] = [];

    if (sortBy === "users") {
      orderBy.push({ users: { _count: sortOrder } });
    } else if (sortBy === "createdAt") {
      orderBy.push({ createdAt: sortOrder });
    } else {
      // Always put built-in profiles first for name sorting
      orderBy.push({ builtIn: "desc" });
      orderBy.push({ name: sortOrder });
    }

    // Get profiles for the user's company
    const dbProfiles = await prisma.permissionProfile.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    });

    const profiles = dbProfiles.map((p) => ({
      ...p,
      permissions:
        typeof p.permissions === "string"
          ? JSON.parse(p.permissions as unknown as string)
          : p.permissions,
    }));

    const total = await prisma.permissionProfile.count({
      where: whereClause,
    });

    return NextResponse.json({
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching permission profiles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Check for duplicate name within company
    const existingProfile = await prisma.permissionProfile.findFirst({
      where: {
        companyId: session.user.companyId,
        name: name.trim(),
      },
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: "Profile name already exists" },
        { status: 400 },
      );
    }

    const profile = await prisma.permissionProfile.create({
      data: {
        companyId: session.user.companyId,
        name: name.trim(),
        description: description?.trim(),
        permissions,
        builtIn: false,
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

