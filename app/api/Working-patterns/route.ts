import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all working patterns
export async function GET() {
  const patterns = await prisma.workingPattern.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(patterns);
}

// CREATE a working pattern
export async function POST(req: Request) {
  const data = await req.json();
  const pattern = await prisma.workingPattern.create({
    data: {
      name: data.name,
      description: data.description,
      workingDays: data.workingDays,
    },
  });
  return NextResponse.json(pattern);
}
