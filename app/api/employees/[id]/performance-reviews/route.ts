import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  normaliseGoals,
  normaliseText,
  parseRating,
  parseReviewDate,
  serialiseReview,
} from "./helpers";

const reviewBodySchema = z.object({
  reviewDate: z
    .string({ required_error: "Review date is required" })
    .trim()
    .min(1, "Review date is required"),
  rating: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional(),
  summary: z.union([z.string(), z.null(), z.undefined()]).optional(),
  strengths: z.union([z.string(), z.null(), z.undefined()]).optional(),
  areasForImprovement: z
    .union([z.string(), z.null(), z.undefined()])
    .optional(),
  goals: z.union([z.array(z.string()), z.string(), z.null(), z.undefined()]).optional(),
});

const reviewUpdateSchema = reviewBodySchema.extend({
  id: z
    .string({ required_error: "Review id is required" })
    .trim()
    .min(1, "Review id is required"),
});

function isManagerOrAdmin(role?: string | null) {
  return (
    role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER"
  );
}

async function getEmployeeForSession(employeeId: string, companyId: string) {
  return prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true, userId: true },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await getEmployeeForSession(
      params.id,
      session.user.companyId,
    );
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const canView =
      isManagerOrAdmin(session.user.role) ||
      session.user.id === employee.userId;

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reviews = await prisma.employeePerformanceReview.findMany({
      where: {
        employeeId: employee.id,
        companyId: session.user.companyId,
      },
      orderBy: { reviewDate: "desc" },
      include: {
        Reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(reviews.map(serialiseReview));
  } catch (error) {
    console.error("[employee-performance-reviews-get]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await getEmployeeForSession(
      params.id,
      session.user.companyId,
    );
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const payload = reviewBodySchema.parse(await req.json());

    let reviewDate: Date;
    try {
      reviewDate = parseReviewDate(payload.reviewDate);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    let rating: number | null = null;
    try {
      rating = parseRating(payload.rating);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const goals = normaliseGoals(payload.goals ?? null);

    const created = await prisma.employeePerformanceReview.create({
      data: {
        id: crypto.randomUUID(),
        employeeId: employee.id,
        companyId: session.user.companyId,
        reviewerId: session.user.id,
        reviewDate,
        rating,
        summary: normaliseText(payload.summary),
        strengths: normaliseText(payload.strengths),
        areasForImprovement: normaliseText(payload.areasForImprovement),
        goals: goals ?? Prisma.DbNull,
      },
      include: {
        Reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(
      { review: serialiseReview(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[employee-performance-reviews-post]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await getEmployeeForSession(
      params.id,
      session.user.companyId,
    );
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const payload = reviewUpdateSchema.parse(await req.json());

    const existing = await prisma.employeePerformanceReview.findFirst({
      where: {
        id: payload.id,
        employeeId: employee.id,
        companyId: session.user.companyId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let reviewDate: Date;
    try {
      reviewDate = parseReviewDate(payload.reviewDate);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    let rating: number | null = null;
    try {
      rating = parseRating(payload.rating);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const goals = normaliseGoals(payload.goals ?? null);

    const updated = await prisma.employeePerformanceReview.update({
      where: { id: existing.id },
      data: {
        reviewDate,
        rating,
        summary: normaliseText(payload.summary),
        strengths: normaliseText(payload.strengths),
        areasForImprovement: normaliseText(payload.areasForImprovement),
        goals: goals ?? Prisma.DbNull,
        reviewerId: session.user.id,
      },
      include: {
        Reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ review: serialiseReview(updated) });
  } catch (error) {
    console.error("[employee-performance-reviews-put]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

