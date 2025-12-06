import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { z } from "zod";

const updateSchema = z.object({
  content: z.string().min(1, "Content is required"),
  progress: z.number().min(0).max(100).optional(),
});

function isManagerOrAdmin(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "HR";
}

async function getObjectiveType(id: string, companyId: string) {
  const companyObj = await prisma.companyObjective.findFirst({
    where: { id, companyId },
  });
  if (companyObj) return "company";

  const teamObj = await prisma.teamObjective.findFirst({
    where: { id, companyId },
  });
  if (teamObj) return "team";

  const personalObj = await prisma.personalObjective.findFirst({
    where: { id, companyId },
  });
  if (personalObj) return "personal";

  return null;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    const objectiveType = await getObjectiveType(id, session.user.companyId);
    if (!objectiveType) {
      return NextResponse.json({ error: "Objective not found" }, { status: 404 });
    }

    // Create the update
    const update = await prisma.objectiveUpdate.create({
      data: {
        id: crypto.randomUUID(),
        content: validated.content,
        progress: validated.progress,
        authorId: session.user.id,
        ...(objectiveType === "company" && { companyObjectiveId: id }),
        ...(objectiveType === "team" && { teamObjectiveId: id }),
        ...(objectiveType === "personal" && { personalObjectiveId: id }),
      },
      include: {
        Author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // If progress was provided, update the objective
    if (validated.progress !== undefined) {
      if (objectiveType === "company") {
        await prisma.companyObjective.update({
          where: { id },
          data: { progress: validated.progress },
        });
      } else if (objectiveType === "team") {
        await prisma.teamObjective.update({
          where: { id },
          data: { progress: validated.progress },
        });
      } else if (objectiveType === "personal") {
        await prisma.personalObjective.update({
          where: { id },
          data: { progress: validated.progress },
        });
      }
    }

    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    console.error("[objective-update-post]", error);
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
