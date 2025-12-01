/**
 * Report Filter Presets API
 * 
 * Manages company-level and personal filter presets for reports.
 * Presets can be shared across the organization or kept private.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { z } from "zod";

const filterPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  filterGroup: z.any(), // FilterGroup structure
  scope: z.enum(["personal", "team", "company"]).default("personal"),
  category: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const scope = searchParams.get("scope");

    // Fetch presets visible to this user
    // Personal presets for this user OR company/team presets for this company
    const presets = await prisma.reportFilterPreset.findMany({
      where: {
        OR: [
          // User's personal presets
          {
            userId: session.user.id,
            scope: "personal",
          },
          // Company-wide presets
          {
            companyId: session.user.companyId,
            scope: { in: ["team", "company"] },
          },
        ],
        ...(category && { category }),
        ...(scope && { scope }),
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        createdBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      status: "success",
      data: presets,
    });
  } catch (error: any) {
    console.error("Error fetching filter presets:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch filter presets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = filterPresetSchema.parse(body);

    // If setting as default, unset other defaults for this user/scope
    if (validatedData.isDefault) {
      await prisma.reportFilterPreset.updateMany({
        where: {
          companyId: session.user.companyId,
          scope: validatedData.scope,
          ...(validatedData.scope === "personal" && { userId: session.user.id }),
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const preset = await prisma.reportFilterPreset.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        filterGroup: validatedData.filterGroup,
        scope: validatedData.scope,
        category: validatedData.category,
        isDefault: validatedData.isDefault,
        companyId: session.user.companyId,
        userId: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      status: "success",
      data: preset,
    });
  } catch (error: any) {
    console.error("Error creating filter preset:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preset data", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create filter preset" },
      { status: 500 }
    );
  }
}






