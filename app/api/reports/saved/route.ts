import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, fields } = await req.json();

    if (!name || !fields) {
      return NextResponse.json({ error: "Name and fields are required" }, { status: 400 });
    }

    const savedReport = await prisma.savedReport.create({
      data: {
        name,
        fields,
        createdById: session.user.id,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(savedReport, { status: 201 });
  } catch (error) {
    console.error("Error creating saved report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedReports = await prisma.savedReport.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(savedReports);
  } catch (error) {
    console.error("Error fetching saved reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
