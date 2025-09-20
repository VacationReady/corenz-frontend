import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      where: { companyId: session.user.companyId }, // ✅ Scoped to company
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        code: true,
        User_Department_headIdToUser: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(departments); // ✅ Clean array for frontend
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Department name is required." },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Check duplicate within the same company using compound unique
    const existing = await prisma.department.findUnique({
      where: {
        companyId_name: {
          companyId: session.user.companyId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists." },
        { status: 400 },
      );
    }

    const department = await prisma.department.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        companyId: session.user.companyId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    // Scope delete to the current company to avoid cross-tenant access
    const result = await prisma.department.deleteMany({
      where: { id: String(body.id), companyId: session.user.companyId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete" }, { status: 400 });
  }
}

