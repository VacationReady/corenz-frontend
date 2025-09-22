import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const companyIdFromSession = (session as any)?.user?.companyId as string | undefined;
    if (!companyIdFromSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const company = await prisma.company.findUnique({
      where: { id: companyIdFromSession },
      select: { publicHolidayTemplate: true, publicHolidayRegion: true },
    });
    return NextResponse.json({ template: company?.publicHolidayTemplate ?? null, region: company?.publicHolidayRegion ?? null });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyIdFromSession = (session as any)?.user?.companyId as string | undefined;
    const role = (session as any)?.user?.role as string | undefined;
    if (!companyIdFromSession || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const template = (body?.template || null) as "NZ" | "AU" | "UK" | null;
    const region = (body?.region || null) as string | null;
    if (template && !["NZ", "AU", "UK"].includes(template)) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    await prisma.company.update({
      where: { id: companyIdFromSession },
      data: { publicHolidayTemplate: template as any, publicHolidayRegion: region },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


