import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET a single pattern with structured days
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const pattern = await prisma.workingPattern.findUnique({
      where: { id: params.id },
      include: { days: true },
    });
    return NextResponse.json(pattern, { status: 200 });
  } catch (error) {
    console.error("GET /api/working-patterns/[id] error:", error);
    return NextResponse.json({ message: "Error fetching pattern" }, { status: 500 });
  }
}

// UPDATE a single pattern (name and description only for now)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();

    const updated = await prisma.workingPattern.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        // workingDays removed, structured days will be handled later
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PUT /api/working-patterns/[id] error:", error);
    return NextResponse.json({ message: "Error updating pattern" }, { status: 500 });
  }
}

// ARCHIVE (soft delete) a single pattern
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const archived = await prisma.workingPattern.update({
      where: { id: params.id },
      data: { active: false },
    });
    return NextResponse.json(archived, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/working-patterns/[id] error:", error);
    return NextResponse.json({ message: "Error archiving pattern" }, { status: 500 });
  }
}
