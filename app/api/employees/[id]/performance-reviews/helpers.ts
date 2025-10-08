import type { Prisma } from "@prisma/client";
import { anonymizeReviewerData, getReviewTypeLabel } from "@/lib/performance-anonymization";

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

  // Apply anonymization based on review type and isAnonymous flag
  const anonymizedReviewer = anonymizeReviewerData(
    review.Reviewer,
    review.reviewType,
    review.isAnonymous
  );

  return {
    id: review.id,
    employeeId: review.employeeId,
    companyId: review.companyId,
    reviewerId: review.isAnonymous ? null : review.reviewerId, // Hide ID if anonymous
    reviewType: review.reviewType,
    reviewTypeLabel: getReviewTypeLabel(review.reviewType),
    isAnonymous: review.isAnonymous,
    reviewDate: review.reviewDate.toISOString(),
    rating: review.rating,
    summary: review.summary,
    strengths: review.strengths,
    areasForImprovement: review.areasForImprovement,
    goals: goalsValue,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    reviewer: anonymizedReviewer,
  };
}
