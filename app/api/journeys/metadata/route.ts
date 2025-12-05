import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import {
  buildMetadataResponse,
  type JourneyTemplateWithRelations,
  JOURNEY_ID_REGEX,
  normaliseJourneyId,
} from "./transformers";

const querySchema = z.object({
  templateId: z.string().optional(),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { templateId } = querySchema.parse({
      templateId: searchParams.get("templateId") ?? undefined,
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        PermissionProfile: true,
      },
    });

    if (!user || !hasPermission(user as any, "onboarding", "read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        publicHolidayRegion: true,
        publicHolidayTemplate: true,
      },
    });

    const templates = (await prisma.journeyTemplate.findMany({
      where: { companyId: session.user.companyId },
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: {
            experienceBlocks: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                name: true,
                description: true,
                blockType: true,
                order: true,
                estimatedDuration: true,
                slaHours: true,
                responsibleRole: true,
                automationConfig: true,
                assets: true,
                successCriteria: true,
                isRequired: true,
              },
            },
          },
        },
        versions: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { version: "desc" },
          take: 10,
        },
        Creator: { select: { id: true, name: true, email: true } },
        LastModifier: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    })) as JourneyTemplateWithRelations[];

    const documentIds = new Set<string>();
    templates.forEach((template) => {
      template.tags = template.tags?.map((tag) => normaliseJourneyId(tag)) ?? [];
      template.phases.forEach((phase) => {
        phase.experienceBlocks.forEach((block) => {
          const ids = new Set<string>();
          const collect = (value: any) => {
            if (!value) return;
            if (typeof value === "string") {
              if (JOURNEY_ID_REGEX.test(value.toUpperCase())) {
                // ignore journey ids
                return;
              }
            }
            if (typeof value === "string" && value.length >= 8) {
              ids.add(value);
            } else if (Array.isArray(value)) {
              value.forEach(collect);
            } else if (typeof value === "object") {
              Object.values(value).forEach(collect);
            }
          };
          collect(block.assets);
          ids.forEach((id) => documentIds.add(id));
        });
      });
    });

    const documents = await prisma.document.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { id: { in: Array.from(documentIds) } },
          { requireAckFromNewStarters: true },
          { requiresAck: true },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        requiresAck: true,
        requireAckFromNewStarters: true,
        requiresSignature: true,
        description: true,
        createdAt: true,
        path: true,
        url: true,
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const retentionRule = await prisma.expiryRule.findFirst({
      where: {
        companyId: session.user.companyId,
        category: "document-retention",
      },
    });

    const retentionYears = retentionRule ? Math.max(1, Math.round(retentionRule.daysBefore / 365)) : 7;

    const response = buildMetadataResponse(templates, documents, {
      selectedTemplateId: templateId,
      retentionYears,
      holidayRegion: company?.publicHolidayRegion ?? null,
      timezone: "Pacific/Auckland",
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[journeys.metadata][GET]", error);
    return NextResponse.json({ error: "Failed to load metadata" }, { status: 500 });
  }
}
