import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

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

type ReviewWithRelations = Prisma.EmployeePerformanceReviewGetPayload<{
  include: {
    Reviewer: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

function isManagerOrAdmin(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

function normaliseGoals(input: unknown): string[] | null {
  if (!input) {
    return null;
  }

  if (Array.isArray(input)) {
    const cleaned = input
      .filter((goal): goal is string => typeof goal === "string")
      .map((goal) => goal.trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
  }

  if (typeof input === "string") {
    const cleaned = input
      .split(/\r?\n/)
      .map((goal) => goal.trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
  }

  return null;
}

function normaliseText(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}

function parseRating(input: unknown): number | null {
  if (input === null || typeof input === "undefined" || input === "") {
    return null;
  }

  const value = typeof input === "string" ? Number(input) : Number(input);
  if (!Number.isFinite(value)) {
    throw new Error("Rating must be a number");
  }

  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  return rounded;
}

function parseReviewDate(input: string): Date {
  const reviewDate = new Date(input);
  if (Number.isNaN(reviewDate.getTime())) {
    throw new Error("Invalid review date");
  }
  return reviewDate;
}

function serialiseReview(review: ReviewWithRelations) {
  const goalsValue = Array.isArray(review.goals)
    ? review.goals.filter((goal): goal is string => typeof goal === "string")
    : [];

  return {
    id: review.id,
    employeeId: review.employeeId,
    companyId: review.companyId,
    reviewerId: review.reviewerId,
    reviewDate: review.reviewDate.toISOString(),
    rating: review.rating,
    summary: review.summary,
    strengths: review.strengths,
    areasForImprovement: review.areasForImprovement,
    goals: goalsValue,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    reviewer: review.Reviewer
      ? {
          id: review.Reviewer.id,
          firstName: review.Reviewer.firstName,
          lastName: review.Reviewer.lastName,
        }
      : null,
  };
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
        goals,
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
        goals,
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

export type { ReviewWithRelations };
export { normaliseGoals, normaliseText, parseRating, parseReviewDate, serialiseReview };
