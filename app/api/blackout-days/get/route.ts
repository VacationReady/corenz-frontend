import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const revalidate = 0; // 🚩 disables Vercel caching for this API route

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const headerCompanyId = (new Headers(req.headers)).get("x-company-id");
    const companyId = session?.user?.companyId || headerCompanyId || null;
    if (!companyId) {
      // Graceful no-op for unauthenticated/unknown tenant to avoid UI toast storms
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = {
      companyId,
      ...(from || to
        ? {
            AND: [
              to ? { date: { lte: new Date(to) } } : {},
              from ? { date: { gte: new Date(from) } } : {},
            ],
          }
        : {}),
    };

    const blackouts = await prisma.blackoutDay.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json(blackouts, {
      headers: {
        "Cache-Control": "no-store", // 🚩 ensures no caching of API response
      },
    });
  } catch (error) {
    console.error("Error fetching blackout days:", error);
    return NextResponse.json(
      { error: "Failed to fetch blackout days." },
      { status: 500 },
    );
  }
}
