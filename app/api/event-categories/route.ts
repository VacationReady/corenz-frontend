export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

// Zod schema for EventCategory payload
const EventCategorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  categoryType: z.enum(["TIME_OFF", "WORKING_EVENT"], { required_error: "Category type is required." }),
  requiresApproval: z.boolean().optional().default(true),
  adminOnly: z.boolean().optional().default(false),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await prisma.eventCategory.findMany({
      where: { isActive: true, companyId: session.user.companyId },
      include: {
        subcategories: {
          where: { isActive: true, companyId: session.user.companyId },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(categories);
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
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.companyId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const json = await req.json();
    const parse = EventCategorySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, categoryType, requiresApproval, adminOnly } = parse.data;

    const existing = await prisma.eventCategory.findFirst({
      where: { name, companyId: session.user.companyId },
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
        categoryType,
        requiresApproval,
        adminOnly,
        companyId: session.user.companyId,
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
