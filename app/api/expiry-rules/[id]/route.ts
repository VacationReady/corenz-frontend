import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { daysBefore, notifyAdmin, notifyManager, notifyEmployee } = body;

    const updatedRule = await prisma.expiryRule.update({
      where: { id: params.id },
      data: {
        ...(daysBefore !== undefined && { daysBefore }),
        ...(notifyAdmin !== undefined && { notifyAdmin }),
        ...(notifyManager !== undefined && { notifyManager }),
        ...(notifyEmployee !== undefined && { notifyEmployee }),
      },
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("Error updating expiry rule:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
