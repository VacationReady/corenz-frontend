import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOnboardingTelemetrySnapshot } from "@/lib/onboarding/telemetry";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedCompanyId = searchParams.get("companyId");
  const sessionCompanyId = session.user.companyId ?? null;

  if (sessionCompanyId && requestedCompanyId && requestedCompanyId !== sessionCompanyId) {
    return NextResponse.json({ error: "Cross-tenant access denied" }, { status: 403 });
  }

  const companyId = sessionCompanyId ?? requestedCompanyId;

  if (!companyId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }

  try {
    const telemetry = await getOnboardingTelemetrySnapshot(companyId);
    return NextResponse.json({ success: true, data: telemetry });
  } catch (error) {
    console.error("Onboarding telemetry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
