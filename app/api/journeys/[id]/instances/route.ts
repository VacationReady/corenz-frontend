import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createInstanceSchema = z.object({
  participantId: z.string().min(1, "Employee ID is required"),
  metadata: z.record(z.any()).optional(),
});

const bulkCreateInstanceSchema = z.object({
  participantIds: z.array(z.string()).min(1, "At least one employee is required"),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/journeys/[id]/instances
 * List all instances for a journey template
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Verify journey belongs to company
    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Build where clause with tenant isolation through journey template
    const where: any = {
      journeyTemplateId: id,
      // Extra tenant safety: ensure participant belongs to same company
      participant: {
        companyId: session.user.companyId,
      },
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const [instances, total] = await Promise.all([
      prisma.journeyInstance.findMany({
        where,
        include: {
          participant: {
            include: {
              User: {
                select: { id: true, name: true, email: true },
              },
              Department: {
                select: { id: true, name: true },
              },
              JobRole: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.journeyInstance.count({ where }),
    ]);

    return NextResponse.json({
      instances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching journey instances:", error);
    return NextResponse.json(
      { error: "Failed to fetch instances" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journeys/[id]/instances
 * Create a new journey instance for an employee (or bulk create)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Check if bulk or single create
    const isBulk = "participantIds" in body;

    // Verify journey exists and is published
    const journey = await prisma.journeyTemplate.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        phases: {
          include: {
            experienceBlocks: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    if (journey.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Journey must be published before assigning employees" },
        { status: 400 }
      );
    }

    if (isBulk) {
      // Bulk create instances
      const validatedData = bulkCreateInstanceSchema.parse(body);
      
      // Verify all employees exist and belong to company
      // Use tenant-scoped query to prevent information leakage about employee IDs from other tenants
      const employees = await prisma.employee.findMany({
        where: {
          id: { in: validatedData.participantIds },
          companyId: session.user.companyId,
        },
        select: { id: true },
      });

      if (employees.length !== validatedData.participantIds.length) {
        // Don't reveal which specific IDs are invalid to prevent tenant ID enumeration
        return NextResponse.json(
          { error: "One or more employees could not be found. Please verify all employee selections." },
          { status: 400 }
        );
      }

      // Check for existing active instances
      const existingInstances = await prisma.journeyInstance.findMany({
        where: {
          journeyTemplateId: id,
          participantId: { in: validatedData.participantIds },
          status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        },
      });

      const existingParticipantIds = existingInstances.map(i => i.participantId);
      const newParticipantIds = validatedData.participantIds.filter(
        pid => !existingParticipantIds.includes(pid)
      );

      if (newParticipantIds.length === 0) {
        return NextResponse.json(
          { error: "All selected employees already have active instances" },
          { status: 400 }
        );
      }

      // Get first phase and block for initial position
      const firstPhase = journey.phases[0];
      const firstBlock = firstPhase?.experienceBlocks[0];

      // Create instances
      const instances = await prisma.journeyInstance.createMany({
        data: newParticipantIds.map(participantId => ({
          id: crypto.randomUUID(),
          journeyTemplateId: id,
          participantId,
          status: "NOT_STARTED",
          progress: 0,
          currentPhaseId: firstPhase?.id || null,
          currentBlockId: firstBlock?.id || null,
          metadata: validatedData.metadata || {},
        })),
      });

      // Create audit log
      await prisma.globalAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId,
          actorId: session.user.id,
          actorType: "USER",
          action: "CREATED",
          entityType: "JOURNEY_INSTANCE" as any,
          entityId: id,
          metadata: {
            journeyName: journey.name,
            participantCount: newParticipantIds.length,
            skippedCount: existingParticipantIds.length,
          },
        },
      });

      return NextResponse.json({
        created: instances.count,
        skipped: existingParticipantIds.length,
        message: `Created ${instances.count} instances, ${existingParticipantIds.length} already had active instances`,
      }, { status: 201 });

    } else {
      // Single create
      const validatedData = createInstanceSchema.parse(body);

      // Verify employee exists and belongs to company
      const employee = await prisma.employee.findFirst({
        where: {
          id: validatedData.participantId,
          companyId: session.user.companyId,
        },
      });

      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      // Check for existing active instance
      const existingInstance = await prisma.journeyInstance.findFirst({
        where: {
          journeyTemplateId: id,
          participantId: validatedData.participantId,
          status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        },
      });

      if (existingInstance) {
        return NextResponse.json(
          { error: "Employee already has an active instance of this journey" },
          { status: 400 }
        );
      }

      // Get first phase and block for initial position
      const firstPhase = journey.phases[0];
      const firstBlock = firstPhase?.experienceBlocks[0];

      // Create instance
      const instance = await prisma.journeyInstance.create({
        data: {
          id: crypto.randomUUID(),
          journeyTemplateId: id,
          participantId: validatedData.participantId,
          status: "NOT_STARTED",
          progress: 0,
          currentPhaseId: firstPhase?.id || null,
          currentBlockId: firstBlock?.id || null,
          metadata: validatedData.metadata || {},
        },
        include: {
          participant: {
            include: {
              User: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          journeyTemplate: {
            select: { id: true, name: true },
          },
        },
      });

      // Create audit log
      await prisma.globalAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          companyId: session.user.companyId,
          actorId: session.user.id,
          actorType: "USER",
          action: "CREATED",
          entityType: "JOURNEY_INSTANCE" as any,
          entityId: instance.id,
          metadata: {
            journeyName: journey.name,
            participantName: instance.participant.User?.name || "Unknown",
          },
        },
      });

      return NextResponse.json(instance, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating journey instance:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create instance" },
      { status: 500 }
    );
  }
}

