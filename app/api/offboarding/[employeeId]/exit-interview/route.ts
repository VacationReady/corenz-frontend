import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { exitInterviewSchema } from "./schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = exitInterviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const employeeId = params.employeeId;
    const data = parsed.data;

    // Find the offboarding record for this employee
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { employeeId },
    });

    if (!offboarding) {
      return NextResponse.json({ error: "Offboarding not found" }, { status: 404 });
    }

    const exitInterview = await prisma.exitInterview.upsert({
      where: { offboardingId: offboarding.id },
      update: {
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        interviewerId: data.interviewerId ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        completed: data.completed ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        offboardingId: offboarding.id,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        interviewerId: data.interviewerId ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        completed: data.completed ?? false,
      },
    });

    let interviewer = null;
    if (exitInterview.interviewerId) {
      interviewer = await prisma.user.findUnique({
        where: { id: exitInterview.interviewerId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
    }

    return NextResponse.json({ exitInterview: { ...exitInterview, interviewer } });
  } catch (error) {
    console.error("Error saving exit interview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
