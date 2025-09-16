import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(courses);
}

