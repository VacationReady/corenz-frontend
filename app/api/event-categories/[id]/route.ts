import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
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
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const category = await prisma.eventCategory.findUnique({
      where: { id },
      include: { subcategories: true },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Event category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    console.error("[Event Categories GET]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch event category." },
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
    const parse = UpdateEventCategorySchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedCategory = await prisma.eventCategory.update({
      where: { id },
      data: parse.data,
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
