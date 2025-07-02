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
    const { name, requiresApproval, adminOnly, isActive } = await req.json();

    const updatedCategory = await prisma.eventCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(requiresApproval !== undefined && { requiresApproval }),
        ...(adminOnly !== undefined && { adminOnly }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: updatedCategory });
  } catch (error: any) {
    console.error("[Event Categories PATCH]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update event category." },
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

    const archivedCategory = await prisma.eventCategory.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true, data: archivedCategory });
  } catch (error: any) {
    console.error("[Event Categories DELETE]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to archive event category." },
      { status: 500 }
    );
  }
}
