import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = params;
    const { name, defaultPaidStatus, isActive } = await req.json();

    const updatedSubcategory = await prisma.eventSubcategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(defaultPaidStatus && { defaultPaidStatus }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: updatedSubcategory });
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
