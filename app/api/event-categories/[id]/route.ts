export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

// Zod schema for PATCH payload
const UpdateEventCategorySchema = z.object({
  name: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  adminOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET single event category
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;

    const category = await prisma.eventCategory.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        EventSubcategory: {
          where: { companyId: session.user.companyId },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    console.error("[Event Categories GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch event category.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    // Prevent edits on system-defined categories
    const category = await prisma.eventCategory.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 },
      );
    }

    if (category.systemDefined) {
      return NextResponse.json(
        { success: false, error: "Cannot edit system-defined categories." },
        { status: 400 },
      );
    }

    const json = await req.json();
    const parse = UpdateEventCategorySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updateResult = await prisma.eventCategory.updateMany({
      where: { id, companyId: session.user.companyId },
      data: parse.data,
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 },
      );
    }

    const updatedCategory = await prisma.eventCategory.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 },
      );
    }

    console.log("[Event Categories PATCH] Updated:", updatedCategory);

    return NextResponse.json({
      success: true,
      message: parse.data.isActive
        ? "Category reactivated successfully."
        : "Category updated successfully.",
      data: updatedCategory,
    });
  } catch (error: any) {
    console.error("[Event Categories PATCH]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update event category.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;

    // Prevent deletion on system-defined categories
    const category = await prisma.eventCategory.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 },
      );
    }

    if (category.systemDefined) {
      return NextResponse.json(
        { success: false, error: "Cannot archive system-defined categories." },
        { status: 400 },
      );
    }

    const updateResult = await prisma.eventCategory.updateMany({
      where: { id, companyId: session.user.companyId },
      data: { isActive: false },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 },
      );
    }

    const archivedCategory = await prisma.eventCategory.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!archivedCategory) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: archivedCategory });
  } catch (error: any) {
    console.error("[Event Categories DELETE]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to archive event category.",
      },
      { status: 500 },
    );
  }
}
