import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN" || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rules = await prisma.expiryRule.findMany({
      where: { OR: [{ companyId: session.user.companyId }, { companyId: null }] },
      orderBy: { category: "asc" },
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching expiry rules:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

