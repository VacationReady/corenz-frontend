import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  // Minimal placeholder endpoint to avoid 404s; returns empty list or default tips.
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json([], { status: 200 });
    }

    const tips = [
      { title: "Take a short walk today", category: "wellbeing" },
      { title: "Stay hydrated — grab some water", category: "wellbeing" },
    ];

    return NextResponse.json(tips, { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}


