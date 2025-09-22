import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type Region = "NZ" | "AU" | "UK";

function getRegionFromCompany(template: string | null | undefined): Region | null {
  if (template === "NZ" || template === "AU" || template === "UK") return template;
  return null;
}

// Minimal, static templates; can be upgraded to external sources later
function getHolidays(region: Region, fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const within = (d: Date) => d >= from && d <= to;

  // Simple sample data per region (common fixed days); can be extended
  const year = from.getUTCFullYear();
  const base: Record<Region, { date: string; title: string }[]> = {
    NZ: [
      { date: `${year}-01-01`, title: "New Year’s Day" },
      { date: `${year}-02-06`, title: "Waitangi Day" },
      { date: `${year}-04-25`, title: "ANZAC Day" },
      { date: `${year}-12-25`, title: "Christmas Day" },
      { date: `${year}-12-26`, title: "Boxing Day" },
    ],
    AU: [
      { date: `${year}-01-01`, title: "New Year’s Day" },
      { date: `${year}-01-26`, title: "Australia Day" },
      { date: `${year}-04-25`, title: "ANZAC Day" },
      { date: `${year}-12-25`, title: "Christmas Day" },
      { date: `${year}-12-26`, title: "Boxing Day" },
    ],
    UK: [
      { date: `${year}-01-01`, title: "New Year’s Day" },
      { date: `${year}-05-01`, title: "Early May bank holiday (approx)" },
      { date: `${year}-12-25`, title: "Christmas Day" },
      { date: `${year}-12-26`, title: "Boxing Day" },
    ],
  };

  return base[region]
    .map((h) => ({
      date: new Date(`${h.date}T00:00:00.000Z`),
      title: h.title,
    }))
    .filter((h) => within(h.date))
    .map((h) => ({
      title: h.title,
      start: h.date.toISOString().slice(0, 10),
      end: h.date.toISOString().slice(0, 10),
      allDay: true,
    }));
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { publicHolidayTemplate: true },
    });
    const region = getRegionFromCompany(company?.publicHolidayTemplate ?? null);
    if (!region) return NextResponse.json([]);
    const events = getHolidays(region, from, to);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


