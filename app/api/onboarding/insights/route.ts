import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { getOnboardingInsights } from "@/lib/onboarding/insights";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const jobRoleId = searchParams.get("jobRoleId") || undefined;

    const insights = await getOnboardingInsights(session.user.companyId, {
      templateId,
      departmentId,
      jobRoleId,
    });

    return NextResponse.json({ success: true, data: insights });
  } catch (error) {
    console.error("Onboarding insights error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
