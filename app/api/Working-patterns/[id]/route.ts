import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET a single pattern
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const pattern = await prisma.workingPattern.findUnique({
    where: { id: params.id },
  });
  return NextResponse.json(pattern);
}

// UPDATE a pattern
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const updated = await prisma.workingPattern.update({
    where: { id: params.id },
    data: {
      name: data.name,
      description: data.description,
      workingDays: data.workingDays,
    },
  });
  return NextResponse.json(updated);
}

// ARCHIVE a pattern (soft delete)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const archived = await prisma.workingPattern.update({
    where: { id: params.id },
    data: { active: false },
  });
  return NextResponse.json(archived);
}
