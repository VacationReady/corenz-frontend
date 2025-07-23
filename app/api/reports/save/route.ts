import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { name, fields, category } = await req.json();

    const newReport = await prisma.savedReport.create({
      data: {
        name,
        category: category || "Uncategorised",
        fields, // ✅ native array, no stringify
        createdBy: session.user.id,
        companyId: session.user.companyId ?? null,
      },
    });

    return NextResponse.json({ success: true, data: newReport });
  } catch (err) {
    console.error("❌ Failed to save report:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
