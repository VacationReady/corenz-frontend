import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      // Remove or update this line depending on your schema
      // include: { manager: true },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Failed to load employees:", error);
    return NextResponse.json({ error: "Failed to load employees" }, { status: 500 });
  }
}
