import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    const subcategories = await prisma.eventSubcategory.findMany({
      include: {
        eventCategory: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: subcategories });
  } catch (error: any) {
    console.error("[Event Subcategories GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch event subcategories." },
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
    const { name, eventCategoryId, defaultPaidStatus = "PAID" } = await req.json();

    if (!name || !eventCategoryId) {
      return NextResponse.json(
        { success: false, error: "Name and eventCategoryId are required." },
        { status: 400 }
      );
    }

    const newSubcategory = await prisma.eventSubcategory.create({
      data: {
        name,
        eventCategory: { connect: { id: eventCategoryId } },
        defaultPaidStatus,
      },
    });

    return NextResponse.json({ success: true, data: newSubcategory });
  } catch (error: any) {
    console.error("[Event Subcategories POST]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create event subcategory." },
      { status: 500 }
    );
  }
}
