import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateJourneySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  persona: z.string().optional(),
  duration: z.number().min(1).max(365).optional(),
  category: z.string().optional(),
  businessGoals: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  nodes: z.array(z.any()).optional(), // ReactFlow nodes
  edges: z.array(z.any()).optional(), // ReactFlow edges
});

// GET /api/journeys/[id] - Get a specific journey template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        phases: {
          include: {
            experienceBlocks: {
              include: {
                feedbackSignals: true,
                governanceLocks: true,
              },
              orderBy: { order: "asc" },
            },
            decisionGateways: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        metricBindings: true,
        experiments: {
          orderBy: { createdAt: "desc" },
        },
        governanceLocks: {
          include: {
            LockedByUser: {
              select: { id: true, name: true, email: true },
            },
            UnlockedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          where: { parentId: null },
          orderBy: { createdAt: "desc" },
        },
        versions: {
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { version: "desc" },
          take: 10,
        },
        instances: {
          include: {
            participant: {
              include: {
                User: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { startedAt: "desc" },
          take: 20,
        },
        Creator: {
          select: { id: true, name: true, email: true },
        },
        LastModifier: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    return NextResponse.json(journey);
  } catch (error) {
    console.error("Error fetching journey:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey" },
      { status: 500 }
    );
  }
}

// PUT /api/journeys/[id] - Update a journey template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateJourneySchema.parse(body);

    // Check if journey exists and user has permission
    const existingJourney = await prisma.journeyTemplate.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        governanceLocks: true,
      },
    });

    if (!existingJourney) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Check for governance locks
    const activeLocks = existingJourney.governanceLocks.filter(
      lock => !lock.unlockedAt
    );
    
    if (activeLocks.length > 0) {
      return NextResponse.json(
        { error: "Journey is locked for editing", locks: activeLocks },
        { status: 423 }
      );
    }

    // Create version snapshot before updating
    await prisma.journeyVersion.create({
      data: {
        journeyTemplateId: params.id,
        version: existingJourney.version + 1,
        changes: {
          updatedBy: session.user.id,
          timestamp: new Date(),
          changes: Object.keys(validatedData),
        },
        createdBy: session.user.id,
        snapshot: existingJourney,
      },
    });

    // Update the journey
    const updatedJourney = await prisma.journeyTemplate.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        lastModifiedBy: session.user.id,
        version: existingJourney.version + 1,
      },
      include: {
        phases: {
          include: {
            experienceBlocks: true,
            decisionGateways: true,
          },
          orderBy: { order: "asc" },
        },
        metricBindings: true,
        experiments: true,
      },
    });

    return NextResponse.json(updatedJourney);
  } catch (error) {
    console.error("Error updating journey:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update journey" },
      { status: 500 }
    );
  }
}

// DELETE /api/journeys/[id] - Delete a journey template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if journey exists and user has permission
    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        instances: true,
        governanceLocks: true,
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Check if journey has active instances
    const activeInstances = journey.instances.filter(
      instance => instance.status === "IN_PROGRESS"
    );

    if (activeInstances.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete journey with active instances",
          activeInstances: activeInstances.length 
        },
        { status: 409 }
      );
    }

    // Check for governance locks
    const activeLocks = journey.governanceLocks.filter(
      lock => !lock.unlockedAt
    );
    
    if (activeLocks.length > 0) {
      return NextResponse.json(
        { error: "Journey is locked and cannot be deleted", locks: activeLocks },
        { status: 423 }
      );
    }

    // Soft delete by archiving
    await prisma.journeyTemplate.update({
      where: { id: params.id },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        lastModifiedBy: session.user.id,
      },
    });

    return NextResponse.json({ message: "Journey archived successfully" });
  } catch (error) {
    console.error("Error deleting journey:", error);
    return NextResponse.json(
      { error: "Failed to delete journey" },
      { status: 500 }
    );
  }
}
