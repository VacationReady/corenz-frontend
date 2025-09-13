import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const jobRoles = await prisma.jobRole.findMany({
      where: { companyId: session.user.companyId }, // ✅ Scoped to company
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        level: true,
        payGrade: true,
      },
    });

    return NextResponse.json({ success: true, jobRoles });
  } catch (error) {
    console.error("Error fetching job roles:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch job roles" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Job role name is required." },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // ✅ Check duplicate within the same company using compound unique
    const existing = await prisma.jobRole.findUnique({
      where: {
        companyId_name: {
          companyId: session.user.companyId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A job role with this name already exists." },
        { status: 400 },
      );
    }

    // ✅ Create job role linked to company
    const jobRole = await prisma.jobRole.create({
      data: {
        name: name.trim(),
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json({ success: true, jobRole });
  } catch (error) {
    console.error("Error creating job role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create job role" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    if (!body?.id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

    await prisma.jobRole.delete({ where: { id: String(body.id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to delete" }, { status: 400 });
  }
}
