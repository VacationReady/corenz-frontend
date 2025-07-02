import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    const categories = await prisma.eventCategory.findMany({
      include: {
        subcategories: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error("[Event Categories GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch event categories." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, type, requiresApproval = true, adminOnly = false } = await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: "Name and type are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.eventCategory.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Event category with this name already exists." },
        { status: 400 }
      );
    }

    const newCategory = await prisma.eventCategory.create({
      data: {
        name,
        type,
        requiresApproval,
        adminOnly,
      },
    });

    return NextResponse.json({ success: true, data: newCategory });
  } catch (error: any) {
    console.error("[Event Categories POST]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create event category." },
      { status: 500 }
    );
  }
}
