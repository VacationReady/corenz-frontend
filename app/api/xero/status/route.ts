import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await prisma.xeroIntegration.findUnique({
      where: { companyId: session.user.companyId },
      select: {
        id: true,
        xeroTenantId: true,
        connectedAt: true,
        lastSyncAt: true,
        isActive: true,
        scopes: true,
      },
    });

    if (!integration) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      ...integration,
    });
  } catch (error) {
    console.error("Error fetching Xero status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
