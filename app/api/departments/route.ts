import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, departments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ success: false, error: "Department name is required." }, { status: 400 });
    }

    const department = await prisma.department.create({
      data: { name: name.trim() },
    });

    return NextResponse.json({ success: true, department });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json({ success: false, error: "Failed to create department" }, { status: 500 });
  }
}
