
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Define schema for validation
const WorkingPatternSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

// GET all working patterns
export async function GET() {
  try {
    const patterns = await prisma.workingPattern.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { days: true },
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
    const json = await req.json();

    // Validate using Zod
    const parsed = WorkingPatternSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description } = parsed.data;

    const pattern = await prisma.workingPattern.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/working-patterns error:", JSON.stringify(error, null, 2));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { message: "A working pattern with this name already exists." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Error creating working pattern", error: error?.message || error },
      { status: 500 }
    );
  }
}
