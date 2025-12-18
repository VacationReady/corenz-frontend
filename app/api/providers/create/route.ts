import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const provider = await prisma.trainingProvider.create({
      data: {
        id: `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error creating provider:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

