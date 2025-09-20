import type { Prisma } from "@prisma/client";

export type ReviewWithRelations = Prisma.EmployeePerformanceReviewGetPayload<{
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

export function normaliseGoals(input: unknown): string[] | null {
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

export function normaliseText(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}

export function parseRating(input: unknown): number | null {
  if (input === null || typeof input === "undefined" || input === "") {
    return null;
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    throw new Error("Rating must be a number");
  }

  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  return rounded;
}

export function parseReviewDate(input: string): Date {
  const reviewDate = new Date(input);
  if (Number.isNaN(reviewDate.getTime())) {
    throw new Error("Invalid review date");
  }
  return reviewDate;
}

export function serialiseReview(review: ReviewWithRelations) {
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
