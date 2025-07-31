// /app/api/onboarding/assignments/route.ts
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Find any active assignment for this user
  const assignment = await prisma.onboardingAssignment.findFirst({
    where: {
      userId: session.user.id,
      completedAt: null,
    },
    include: { template: { include: { steps: true } } }
  });

  return NextResponse.json({ assignment });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { templateId, userId } = await req.json();

  // Create assignment
  const assignment = await prisma.onboardingAssignment.create({
    data: {
      userId,
      templateId,
      progress: [],
    }
  });

  return NextResponse.json({ assignment });
}
