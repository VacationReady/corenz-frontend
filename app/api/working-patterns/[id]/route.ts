import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET a single pattern
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const pattern = await prisma.workingPattern.findUnique({
      where: { id: params.id },
      include: {
        days: true, // include structured days for your future UI and leave calc logic
      },
    });
    return NextResponse.json(pattern, { status: 200 });
  } catch (error) {
    console.error("GET /api/working-patterns/[id] error:", error);
    return NextResponse.json({ message: "Error fetching pattern" }, { status: 500 });
  }
}

// UPDATE a pattern (name, description only for now)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();

    const updated = await prisma.workingPattern.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        // No workingDays here anymore due to schema change
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PUT /api/working-patterns/[id] error:", error);
    return NextResponse.json({ message: "Error updating pattern" }, { status: 500 });
  }
}

// ARCHIVE a pattern (soft delete)
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
