export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

// Zod schema for PATCH payload
const UpdateSubcategorySchema = z.object({
  name: z.string().optional(),
  defaultPaidStatus: z.enum(["PAID", "UNPAID"]).optional(),
  isActive: z.boolean().optional(),
});

// GET single subcategory
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

    const subcategory = await prisma.eventSubcategory.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        EventCategory: { companyId: session.user.companyId },
      },
      include: { EventCategory: true },
    });

    if (!subcategory) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: subcategory });
  } catch (error: any) {
    console.error("[Event Subcategories GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch event subcategory.",
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

    const existingSubcategory = await prisma.eventSubcategory.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        EventCategory: { companyId: session.user.companyId },
      },
    });

    if (!existingSubcategory) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 },
      );
    }

    const json = await req.json();
    const parse = UpdateSubcategorySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updateResult = await prisma.eventSubcategory.updateMany({
      where: { id, companyId: session.user.companyId },
      data: parse.data,
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 },
      );
    }

    const updatedSubcategory = await prisma.eventSubcategory.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        EventCategory: { companyId: session.user.companyId },
      },
    });

    if (!updatedSubcategory) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 },
      );
    }

    console.log("[Event Subcategories PATCH] Updated:", updatedSubcategory);

    return NextResponse.json({
      success: true,
      message: parse.data.isActive
        ? "Subcategory reactivated successfully."
        : "Subcategory updated successfully.",
      data: updatedSubcategory,
    });
  } catch (error: any) {
    console.error("[Event Subcategories PATCH]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update event subcategory.",
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

    const existingSubcategory = await prisma.eventSubcategory.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        EventCategory: { companyId: session.user.companyId },
      },
    });

    if (!existingSubcategory) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 },
      );
    }

    const updateResult = await prisma.eventSubcategory.updateMany({
      where: { id, companyId: session.user.companyId },
      data: { isActive: false },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 },
      );
    }

    const archivedSubcategory = await prisma.eventSubcategory.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
        EventCategory: { companyId: session.user.companyId },
      },
    });

    if (!archivedSubcategory) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: archivedSubcategory });
  } catch (error: any) {
    console.error("[Event Subcategories DELETE]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to archive event subcategory.",
      },
      { status: 500 },
    );
  }
}
