import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { resolveReportingTimeConfig } from "@/lib/reportingTimeConfig";
import { DEFAULT_LOCALE_CODE, DEFAULT_TIMEZONE } from "@/lib/datetime";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const companyId = session?.user?.companyId;

    if (!userId || !companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await resolveReportingTimeConfig(userId, companyId);

    return NextResponse.json({
      timeZone: config.timeZone,
      locale: config.locale,
      tenant: config.tenant,
      source: config.source,
    });
  } catch (error) {
    console.error("[reports/time-config] failed to resolve time config", error);
    return NextResponse.json(
      {
        timeZone: DEFAULT_TIMEZONE,
        locale: DEFAULT_LOCALE_CODE,
        error: "Failed to resolve reporting time preferences",
      },
      { status: 500 },
    );
  }
}

