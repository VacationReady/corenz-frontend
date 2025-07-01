import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Zod schema for validation
const WorkingPatternSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  weeks: z.array(
    z.object({
      weekNumber: z.number().int().min(1, "Week number must be at least 1"),
      days: z.array(
        z.object({
          day: z.string().min(1),
          type: z.enum(["FULL_DAY", "HALF_DAY_AM", "HALF_DAY_PM"]),
        })
      ).min(1, "At least one day must be provided per week"),
    })
  ).min(1, "At least one week must be provided"),
});

// ✅ GET all working patterns, with archived support
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived");

  try {
    const patterns = await prisma.workingPattern.findMany({
      where: {
        active: archived === "true" ? false : true,
      },
      orderBy: { name: "asc" },
      include: {
        weeks: {
          include: { days: true },
          orderBy: { weekNumber: "asc" },
        },
      },
    });
    return NextResponse.json(patterns, { status: 200 });
  } catch (error) {
    console.error("GET /api/working-patterns error:", error);
    return NextResponse.json({ message: "Error fetching patterns" }, { status: 500 });
  }
}

// CREATE a working pattern with multi-week support
export async function POST(req: Request) {
  try {
    const json = await req.json();

    const parsed = WorkingPatternSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, weeks } = parsed.data;

    const pattern = await prisma.workingPattern.create({
      data: {
        name,
        description,
        weeks: {
          create: weeks.map((week) => ({
            weekNumber: week.weekNumber,
            days: {
              create: week.days.map((dayObj) => ({
                day: dayObj.day,
                type: dayObj.type,
              })),
            },
          })),
        },
      },
      include: {
        weeks: {
          include: { days: true },
          orderBy: { weekNumber: "asc" },
        },
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
