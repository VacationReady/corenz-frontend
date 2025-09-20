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
    let rules;
    try {
      // Primary query: scoped to company if column exists
      rules = await prisma.expiryRule.findMany({
        where: {
          OR: [
            { companyId: session.user.companyId },
            { companyId: null as any },
          ],
        },
        orderBy: { category: "asc" },
      });
    } catch (err) {
      // Fallback: in case the database schema lacks companyId on ExpiryRule
      console.error("ExpiryRule company-scoped query failed, falling back:", err);
      rules = await prisma.expiryRule.findMany({
        orderBy: { category: "asc" },
      });
    }
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching expiry rules:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

