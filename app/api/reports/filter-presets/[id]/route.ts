/**
 * Individual Filter Preset API
 * 
 * Handles GET, PATCH, DELETE for specific filter presets.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { z } from "zod";

const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  filterGroup: z.any().optional(),
  scope: z.enum(["personal", "team", "company"]).optional(),
  category: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const preset = await prisma.reportFilterPreset.findFirst({
      where: {
        id: parseInt(id, 10),
        OR: [
          { userId: session.user.id, scope: "personal" },
          { companyId: session.user.companyId, scope: { in: ["team", "company"] } },
        ],
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

    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      data: preset,
    });
  } catch (error: any) {
    console.error("Error fetching filter preset:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch filter preset" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const presetId = parseInt(id, 10);

    // Check ownership/access
    const existingPreset = await prisma.reportFilterPreset.findFirst({
      where: {
        id: presetId,
        companyId: session.user.companyId,
        OR: [
          { userId: session.user.id },
          { scope: { in: ["team", "company"] } },
        ],
      },
    });

    if (!existingPreset) {
      return NextResponse.json({ error: "Preset not found or access denied" }, { status: 404 });
    }

    // Only allow editing personal presets or if user is admin
    if (existingPreset.scope !== "personal" && existingPreset.userId !== session.user.id) {
      // In production, check for admin role here
      // For now, allow updates if user is in same company
    }

    const body = await req.json();
    const validatedData = updatePresetSchema.parse(body);

    // If setting as default, unset other defaults
    if (validatedData.isDefault) {
      const scope = validatedData.scope || existingPreset.scope;
      await prisma.reportFilterPreset.updateMany({
        where: {
          companyId: session.user.companyId,
          scope,
          ...(scope === "personal" && { userId: session.user.id }),
          isDefault: true,
          id: { not: presetId },
        },
        data: { isDefault: false },
      });
    }

    const updatedPreset = await prisma.reportFilterPreset.update({
      where: { id: presetId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.filterGroup && { filterGroup: validatedData.filterGroup }),
        ...(validatedData.scope && { scope: validatedData.scope }),
        ...(validatedData.category !== undefined && { category: validatedData.category }),
        ...(validatedData.isDefault !== undefined && { isDefault: validatedData.isDefault }),
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
      data: updatedPreset,
    });
  } catch (error: any) {
    console.error("Error updating filter preset:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preset data", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to update filter preset" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const presetId = parseInt(id, 10);

    // Check ownership
    const existingPreset = await prisma.reportFilterPreset.findFirst({
      where: {
        id: presetId,
        companyId: session.user.companyId,
        OR: [
          { userId: session.user.id },
          { scope: { in: ["team", "company"] } },
        ],
      },
    });

    if (!existingPreset) {
      return NextResponse.json({ error: "Preset not found or access denied" }, { status: 404 });
    }

    // Only owner can delete
    if (existingPreset.userId !== session.user.id) {
      return NextResponse.json({ error: "Only the preset owner can delete it" }, { status: 403 });
    }

    await prisma.reportFilterPreset.delete({
      where: { id: presetId },
    });

    return NextResponse.json({
      status: "success",
      message: "Preset deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting filter preset:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete filter preset" },
      { status: 500 }
    );
  }
}








