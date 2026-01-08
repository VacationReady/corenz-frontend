import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { z } from "zod";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  templateId: z.string().optional(),
  participantIds: z.array(z.string()).min(1, "At least one participant required"),
  scheduledAt: z.string(),
  duration: z.number().positive().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
  agenda: z.any().optional(),
  isRecurring: z.boolean().optional(),
  recurrence: z.any().optional(),
});

function isManagerOrAdmin(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
}

async function getHandler(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const organizerId = searchParams.get("organizerId");
    const participantId = searchParams.get("participantId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const meetings = await prisma.performanceMeeting.findMany({
      where: {
        companyId: session.user.companyId,
        ...(status && { status: status as any }),
        ...(organizerId && { organizerId }),
        ...(participantId && { participantIds: { has: participantId } }),
        ...(from && to && {
          scheduledAt: {
            gte: new Date(from),
            lte: new Date(to),
          },
        }),
      },
      include: {
        Template: {
          select: { id: true, name: true, type: true },
        },
        Organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        notes: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            Author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        actionItems: {
          where: { status: { in: ["TODO", "IN_PROGRESS"] } },
          orderBy: [
            { priority: "desc" },
            { dueDate: "asc" },
          ],
          include: {
            Assignee: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                email: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("[meetings-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = meetingSchema.parse(body);

    // If template is provided, load agenda from template
    let agenda = validated.agenda;
    if (validated.templateId && !agenda) {
      const template = await prisma.performanceTemplate.findUnique({
        where: { id: validated.templateId },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      if (template) {
        agenda = {
          sections: template.sections.map((section) => ({
            title: section.title,
            description: section.description,
            questions: section.questions.map((q) => ({
              question: q.question,
              type: q.type,
              isRequired: q.isRequired,
            })),
          })),
        };
      }
    }

    const seriesId = validated.isRecurring ? crypto.randomUUID() : null;

    const meeting = await prisma.performanceMeeting.create({
      data: {
        id: crypto.randomUUID(),
        companyId: session.user.companyId,
        title: validated.title,
        description: validated.description,
        templateId: validated.templateId,
        organizerId: session.user.id,
        participantIds: validated.participantIds,
        scheduledAt: new Date(validated.scheduledAt),
        duration: validated.duration || 60,
        location: validated.location,
        meetingUrl: validated.meetingUrl || null,
        agenda,
        isRecurring: validated.isRecurring || false,
        recurrence: validated.recurrence || null,
        seriesId,
      },
      include: {
        Template: {
          select: { id: true, name: true, type: true },
        },
        Organizer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error("[meetings-post]", error);
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

// Apply feature guard
const performanceGuard = withFeatureGuard(FEATURE_KEYS.PERFORMANCE_MANAGEMENT);
export const GET = performanceGuard(getHandler);
export const POST = performanceGuard(postHandler);
