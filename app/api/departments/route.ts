import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });

    // ✅ Return raw array for clean mapping in frontend:
    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Department name is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.department.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists." },
        { status: 400 }
      );
    }

    // ✅ Dynamically fetch the first company for linking
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json(
        { error: "No company found. Please create a company first." },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        company: {
          connect: { id: company.id },
        },
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
