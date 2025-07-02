import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
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
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const subcategory = await prisma.eventSubcategory.findUnique({
      where: { id },
      include: { eventCategory: true },
    });

    if (!subcategory) {
      return NextResponse.json(
        { success: false, error: "Event subcategory not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subcategory });
  } catch (error: any) {
    console.error("[Event Subcategories GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch event subcategory." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = params;
    const json = await req.json();
    const parse = UpdateSubcategorySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedSubcategory = await prisma.eventSubcategory.update({
      where: { id },
      data: parse.data,
    });

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
      { success: false, error: error.message || "Failed to update event subcategory." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = params;

    const archivedSubcategory = await prisma.eventSubcategory.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true, data: archivedSubcategory });
  } catch (error: any) {
    console.error("[Event Subcategories DELETE]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to archive event subcategory." },
      { status: 500 }
    );
  }
}
