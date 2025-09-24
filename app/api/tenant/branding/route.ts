import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;

    const [company, config] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true },
      }),
      prisma.brandingConfiguration.findUnique({
        where: { companyId },
        select: {
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          emailFooterText: true,
        },
      }),
    ]);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const branding = {
      name: company.name,
      shortName: company.name,
      initials: "", // client computes if empty
      logoUrl: config?.logoUrl ?? null,
      squareLogoUrl: config?.logoUrl ?? null,
      accentColor: config?.accentColor ?? null,
      supportEmail: null,
      tagline: config?.emailFooterText ?? null,
      loginHeadline: null,
      loginSubtitle: null,
    };

    return NextResponse.json({ branding });
  } catch (error) {
    console.error("[tenant/branding][GET]", error);
    return NextResponse.json(
      { error: "Failed to load tenant branding" },
      { status: 500 },
    );
  }
}


