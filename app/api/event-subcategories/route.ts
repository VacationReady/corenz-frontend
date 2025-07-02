import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

// Zod schema for EventSubcategory payload
const EventSubcategorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  eventCategoryId: z.string().min(1, "eventCategoryId is required."),
  defaultPaidStatus: z.enum(["PAID", "UNPAID"]).optional().default("PAID"),
  isActive: z.boolean().optional().default(true),
});

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
    const json = await req.json();
    const parse = EventSubcategorySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, eventCategoryId, defaultPaidStatus, isActive } = parse.data;

    // OPTIONAL: Prevent adding subcategories under system-defined categories
    const parentCategory = await prisma.eventCategory.findUnique({
      where: { id: eventCategoryId },
    });

    if (!parentCategory) {
      return NextResponse.json(
        { success: false, error: "Parent category not found." },
        { status: 404 }
      );
    }

    // UNCOMMENT TO BLOCK under system-defined categories:
    // if (parentCategory.systemDefined) {
    //   return NextResponse.json(
    //     { success: false, error: "Cannot add subcategories under system-defined categories." },
    //     { status: 400 }
    //   );
    // }

    const newSubcategory = await prisma.eventSubcategory.create({
      data: {
        name,
        defaultPaidStatus,
        isActive,
        eventCategory: { connect: { id: eventCategoryId } },
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
