import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { name, fields, category } = await req.json();
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: "No fields selected." },
        { status: 400 },
      );
    }

    const newReport = await prisma.savedReport.create({
      data: {
        name,
        category: category || "Uncategorised",
        fields, // ✅ native array, no stringify
        createdBy: session.user.id,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json({ success: true, data: newReport });
  } catch (err) {
    console.error("❌ Failed to save report:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
