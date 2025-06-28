import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobRoles = await prisma.jobRole.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, jobRoles });
  } catch (error) {
    console.error("Error fetching job roles:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch job roles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ success: false, error: "Job role name is required." }, { status: 400 });
    }

    const jobRole = await prisma.jobRole.create({
      data: { name: name.trim() },
    });

    return NextResponse.json({ success: true, jobRole });
  } catch (error) {
    console.error("Error creating job role:", error);
    return NextResponse.json({ success: false, error: "Failed to create job role" }, { status: 500 });
  }
}
