import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { isAIEnabled } from "@/lib/ai/openai-client";

import {
  analyticsFilterSchema,
  getPeopleAnalytics,
} from "./analytics-service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  rangeInMonths: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parseResult = querySchema.safeParse({
    rangeInMonths: searchParams.get("rangeInMonths") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    locationId: searchParams.get("locationId") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { rangeInMonths, departmentId, locationId } = parseResult.data;

  const filtersResult = analyticsFilterSchema.safeParse({
    rangeInMonths: rangeInMonths ? Number(rangeInMonths) : undefined,
    departmentId: departmentId?.trim() || undefined,
    locationId: locationId?.trim() || undefined,
  });

  if (!filtersResult.success) {
    return NextResponse.json(
      { error: "Invalid analytics filter", details: filtersResult.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const analytics = await getPeopleAnalytics(
      session.user.companyId,
      filtersResult.data,
    );

    return NextResponse.json({
      ...analytics,
      supportsAIInsights: isAIEnabled(),
    });
  } catch (error: any) {
    console.error("[analytics:people] failed", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to load analytics" },
      { status: 500 },
    );
  }
}

