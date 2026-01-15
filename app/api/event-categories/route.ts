export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { z } from "zod";

// Zod schema for EventCategory payload
const EventCategorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  categoryType: z.enum(["TIME_OFF", "WORKING_EVENT"], {
    required_error: "Category type is required.",
  }),
  requiresApproval: z.boolean().optional().default(true),
  adminOnly: z.boolean().optional().default(false),
  iconKey: z.string().min(1, "Icon is required."),
  color: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  // Balance configuration fields
  balanceRequired: z.boolean().optional().default(false),
  defaultBalance: z.number().nullable().optional(),
  balanceRefreshMonths: z.number().int().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const categories = await prisma.eventCategory.findMany({
      where: { isActive: true, companyId: session.user.companyId },
      include: {
        EventSubcategory: {
          where: { isActive: true, companyId: session.user.companyId },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch visibility settings separately using raw query
    // This handles the case where Prisma client hasn't been regenerated yet
    let visibilityMap: Map<string, boolean> = new Map();
    try {
      const visibilityData = await prisma.$queryRaw<Array<{
        id: string;
        includeInGeneralVisibility: boolean | null;
      }>>`
        SELECT id, "includeInGeneralVisibility" 
        FROM "EventCategory" 
        WHERE "companyId" = ${session.user.companyId} AND "isActive" = true
      `;
      visibilityData.forEach((cat) => {
        // Default to true if null
        visibilityMap.set(cat.id, cat.includeInGeneralVisibility !== false);
      });
    } catch {
      // Column doesn't exist yet (migration not applied), default all to true
      console.log("[Event Categories GET] includeInGeneralVisibility column not found, using defaults");
    }

    // Normalize shape for consumers expecting `subcategories` while preserving original fields
    const normalized = categories.map((c) => ({
      ...c,
      // Add visibility field from raw query, default to true if not found
      includeInGeneralVisibility: visibilityMap.get(c.id) ?? true,
      subcategories: (c as any).EventSubcategory?.map((s: any) => ({
        id: s.id,
        name: s.name,
        defaultPaidStatus: s.defaultPaidStatus,
        isActive: s.isActive,
        eventCategoryId: s.eventCategoryId,
      })) ?? [],
    }));

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error("[Event Categories GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch event categories.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user ||
    session.user.role !== "ADMIN" ||
    !session.user.companyId
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    const json = await req.json();
    const parse = EventCategorySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, categoryType, requiresApproval, adminOnly, iconKey, color, isActive, balanceRequired, defaultBalance, balanceRefreshMonths } = parse.data;

    const existing = await prisma.eventCategory.findFirst({
      where: { name, companyId: session.user.companyId },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Event category with this name already exists.",
        },
        { status: 400 },
      );
    }

    const newCategory = await prisma.eventCategory.create({
      data: {
        id: crypto.randomUUID(),
        name,
        categoryType,
        requiresApproval,
        adminOnly,
        iconKey,
        color,
        isActive: isActive ?? true,
        balanceRequired: balanceRequired ?? false,
        defaultBalance: balanceRequired ? defaultBalance : null,
        balanceRefreshMonths: balanceRequired ? balanceRefreshMonths : null,
        companyId: session.user.companyId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: newCategory });
  } catch (error: any) {
    console.error("[Event Categories POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create event category.",
      },
      { status: 500 },
    );
  }
}

