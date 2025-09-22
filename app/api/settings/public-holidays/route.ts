import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { publicHolidayTemplate: true },
    });
    return NextResponse.json({ template: company?.publicHolidayTemplate ?? null });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const template = (body?.template || null) as "NZ" | "AU" | "UK" | null;
    if (template && !["NZ", "AU", "UK"].includes(template)) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    await prisma.company.update({
      where: { id: session.user.companyId },
      data: { publicHolidayTemplate: template as any },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


