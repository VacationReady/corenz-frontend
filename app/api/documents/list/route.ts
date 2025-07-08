import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  const documents = await prisma.document.findMany({
    where: {
      companyId: session.user.companyId,
      employeeId: employeeId ?? undefined,
    },
    include: { uploader: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
