import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { z } from "zod";

const reviewCycleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  templateId: z.string().optional(),
  type: z.enum(["PROBATION", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "AD_HOC"]).default("ANNUAL"),
  startDate: z.string(),
  endDate: z.string(),
  selfReviewDeadline: z.string().optional(),
  managerReviewDeadline: z.string().optional(),
  peerReviewDeadline: z.string().optional(),
  isAnonymousPeer: z.boolean().default(true),
  participantIds: z.array(z.string()).min(1, "At least one participant required"),
  settings: z.any().optional(),
});

function isManagerOrAdmin(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const cycles = await prisma.performanceReviewCycle.findMany({
      where: {
        companyId: session.user.companyId,
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
      },
      include: {
        Template: {
          select: { id: true, name: true, type: true },
        },
        Creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        participants: {
          include: {
            reviews: {
              select: {
                id: true,
                reviewerRole: true,
                status: true,
                submittedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ cycles });
  } catch (error) {
    console.error("[review-cycles-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = reviewCycleSchema.parse(body);

    // Create review cycle
    const cycle = await prisma.performanceReviewCycle.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        name: validated.name,
        description: validated.description,
        templateId: validated.templateId,
        type: validated.type,
        status: "DRAFT",
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        selfReviewDeadline: validated.selfReviewDeadline
          ? new Date(validated.selfReviewDeadline)
          : null,
        managerReviewDeadline: validated.managerReviewDeadline
          ? new Date(validated.managerReviewDeadline)
          : null,
        peerReviewDeadline: validated.peerReviewDeadline
          ? new Date(validated.peerReviewDeadline)
          : null,
        isAnonymousPeer: validated.isAnonymousPeer,
        participantIds: validated.participantIds,
        settings: validated.settings || null,
        createdBy: session.user.id,
      },
      include: {
        Template: {
          select: { id: true, name: true, type: true },
        },
        Creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create participant records
    const participants = await Promise.all(
      validated.participantIds.map((employeeId) =>
        prisma.cycleParticipant.create({
          data: {
            id: crypto.randomUUID(),
            cycleId: cycle.id,
            employeeId,
            status: "NOT_STARTED",
          },
        })
      )
    );

    return NextResponse.json({ cycle, participants }, { status: 201 });
  } catch (error) {
    console.error("[review-cycles-post]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
