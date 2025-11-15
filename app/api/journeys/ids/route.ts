import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { JOURNEY_ID_REGEX, normaliseJourneyId, isReservedPrefix } from "../metadata/transformers";

const bodySchema = z.object({
  journeyId: z.string().min(3).max(64),
  templateId: z.string().optional(),
});

const updateSchema = z.object({
  journeyId: z.string().min(3).max(64),
  templateId: z.string(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = bodySchema.parse(await request.json());
    const candidate = normaliseJourneyId(payload.journeyId);

    if (!JOURNEY_ID_REGEX.test(candidate)) {
      return NextResponse.json(
        {
          valid: false,
          message: "Journey IDs must contain only letters, numbers, and hyphens (3-30 characters).",
        },
        { status: 200 },
      );
    }

    const reserved = isReservedPrefix(candidate);
    if (reserved) {
      return NextResponse.json(
        {
          valid: false,
          message: `Prefix ${reserved} is reserved for regulated submissions. Provide supporting milestones before use.`,
        },
        { status: 200 },
      );
    }

    const existing = await prisma.journeyTemplate.findFirst({
      where: {
        companyId: session.user.companyId,
        tags: { has: candidate },
        ...(payload.templateId ? { NOT: { id: payload.templateId } } : {}),
      },
      select: { id: true, name: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          valid: false,
          message: `Journey ID already used by template "${existing.name}"`,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ valid: true, message: "Journey ID available" });
  } catch (error) {
    console.error("[journeys.ids][POST]", error);
    return NextResponse.json({ error: "Unable to validate journey ID" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = updateSchema.parse(await request.json());
    const candidate = normaliseJourneyId(payload.journeyId);

    if (!JOURNEY_ID_REGEX.test(candidate)) {
      return NextResponse.json({ error: "Invalid journey ID" }, { status: 400 });
    }

    const reserved = isReservedPrefix(candidate);
    if (reserved) {
      return NextResponse.json(
        {
          error: `Prefix ${reserved} is reserved for regulated submissions.`,
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        PermissionProfile: true,
      },
    });

    if (!user || !hasPermission(user as any, "onboarding", "edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.journeyTemplate.findFirst({
      where: {
        companyId: session.user.companyId,
        id: payload.templateId,
      },
      select: { tags: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Journey template not found" }, { status: 404 });
    }

    const duplicate = await prisma.journeyTemplate.findFirst({
      where: {
        companyId: session.user.companyId,
        tags: { has: candidate },
        NOT: { id: payload.templateId },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Journey ID already in use" }, { status: 409 });
    }

    const preservedTags = (existing.tags || []).filter((tag) => !JOURNEY_ID_REGEX.test(normaliseJourneyId(tag)));
    preservedTags.push(candidate);

    await prisma.journeyTemplate.update({
      where: { id: payload.templateId },
      data: { tags: preservedTags },
    });

    return NextResponse.json({ success: true, journeyId: candidate });
  } catch (error) {
    console.error("[journeys.ids][PUT]", error);
    return NextResponse.json({ error: "Unable to update journey ID" }, { status: 500 });
  }
}
