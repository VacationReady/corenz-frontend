import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all working patterns
export async function GET() {
  try {
    const patterns = await prisma.workingPattern.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { days: true }, // prepare for structured day retrieval
    });
    return NextResponse.json(patterns, { status: 200 });
  } catch (error) {
    console.error("GET /api/working-patterns error:", error);
    return NextResponse.json({ message: "Error fetching patterns" }, { status: 500 });
  }
}

// CREATE a working pattern (name, description only for now)
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    const pattern = await prisma.workingPattern.create({
      data: {
        name: data.name,
        description: data.description,
        // workingDays removed, replaced later with structured createMany for days
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    console.error("POST /api/working-patterns error:", error);
    return NextResponse.json({ message: "Error creating working pattern" }, { status: 500 });
  }
}
