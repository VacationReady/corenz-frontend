import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  try {
    // Verify employee belongs to the same company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const checks = await prisma.employmentCheck.findMany({
      where: { employeeId: employeeId },
      orderBy: { createdAt: "desc" },
    });

    const withUrls = await Promise.all(
      checks.map(async (c) => {
        if (!c.documentUrl) return c;
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(c.documentUrl, 60 * 5);
        return { ...c, documentUrl: signed?.signedUrl ?? null };
      }),
    );

    return NextResponse.json(withUrls);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
