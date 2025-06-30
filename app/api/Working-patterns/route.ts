import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all working patterns
export async function GET() {
  try {
    const patterns = await prisma.workingPattern.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(patterns, { status: 200 });
  } catch (error) {
    console.error("GET /api/working-patterns error:", error);
    return NextResponse.json({ message: "Error fetching patterns" }, { status: 500 });
  }
}

// CREATE a working pattern
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.name || !Array.isArray(data.workingDays) || data.workingDays.length === 0) {
      return NextResponse.json({ message: "Name and workingDays are required" }, { status: 400 });
    }

    const pattern = await prisma.workingPattern.create({
      data: {
        name: data.name,
        description: data.description,
        workingDays: data.workingDays,
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    console.error("POST /api/working-patterns error:", error);
    return NextResponse.json({ message: "Error creating working pattern" }, { status: 500 });
  }
}
