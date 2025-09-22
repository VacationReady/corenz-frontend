import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
import Holidays from "date-holidays";

type Template = "NZ" | "AU" | "UK";

const CACHE = new Map<string, { ts: number; events: any[] }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function mapTemplateToCountry(template: Template): string {
  if (template === "NZ") return "NZ";
  if (template === "AU") return "AU";
  return "GB"; // UK
}

function buildCacheKey(args: { companyId: string; template: Template; region: string | null; from: string; to: string }) {
  return `${args.companyId}:${args.template}:${args.region || "_"}:${args.from}:${args.to}`;
}

function toEvents(h: any[], fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  return h
    .filter((e) => {
      const d = new Date(e.date);
      return d >= from && d <= to;
    })
    .map((e) => ({
      title: e.name,
      start: e.date,
      allDay: true,
    }));
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyIdFromSession = (session as any)?.user?.companyId as string | undefined;
    if (!companyIdFromSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }
    const company = await prisma.company.findUnique({
      where: { id: companyIdFromSession },
      select: { publicHolidayTemplate: true, publicHolidayRegion: true, id: true },
    });
    const template = (company?.publicHolidayTemplate ?? null) as Template | null;
    if (!template) return NextResponse.json([]);
    const country = mapTemplateToCountry(template);
    const subdivision = company?.publicHolidayRegion || undefined; // e.g., NZ-WGN, AU-NSW, GB-SCT

    const cacheKey = buildCacheKey({ companyId: company!.id, template, region: subdivision || null, from, to });
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.events);
    }

    const hd = new Holidays();
    // Initialize with country; if subdivision present, use it
    if (subdivision) {
      // date-holidays expects country + state code; subdivision often like AU-NSW; split to country/state
      const [c, sub] = subdivision.split("-");
      hd.init(c || country, sub);
    } else {
      hd.init(country);
    }
    // Get raw holidays for the span year(s)
    const startYear = new Date(from).getUTCFullYear();
    const endYear = new Date(to).getUTCFullYear();
    let all: any[] = [];
    for (let y = startYear; y <= endYear; y++) {
      all = all.concat(hd.getHolidays(y) || []);
    }
    const events = toEvents(all, from, to);
    CACHE.set(cacheKey, { ts: Date.now(), events });
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


