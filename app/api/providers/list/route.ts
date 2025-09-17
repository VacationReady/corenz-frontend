import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const providers = await prisma.trainingProvider.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(providers);
}

