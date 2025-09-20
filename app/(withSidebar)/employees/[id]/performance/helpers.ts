export interface Reviewer {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  companyId: string;
  reviewerId: string | null;
  reviewDate: string;
  rating: number | null;
  summary: string | null;
  strengths: string | null;
  areasForImprovement: string | null;
  goals: string[];
  createdAt: string;
  updatedAt: string;
  reviewer: Reviewer | null;
}

export interface ReviewFormState {
  reviewDate: string;
  rating: string;
  summary: string;
  strengths: string;
  areasForImprovement: string;
  goals: string;
}

export interface ReviewPayload {
  reviewDate: string;
  rating: number | null;
  summary: string;
  strengths: string;
  areasForImprovement: string;
  goals: string[];
}

export function createEmptyFormState(): ReviewFormState {
  return {
    reviewDate: "",
    rating: "",
    summary: "",
    strengths: "",
    areasForImprovement: "",
    goals: "",
  };
}

export function createFormStateFromReview(
  review: PerformanceReview,
): ReviewFormState {
  return {
    reviewDate: review.reviewDate ? review.reviewDate.slice(0, 10) : "",
    rating: review.rating ? String(review.rating) : "",
    summary: review.summary ?? "",
    strengths: review.strengths ?? "",
    areasForImprovement: review.areasForImprovement ?? "",
    goals:
      review.goals && review.goals.length > 0 ? review.goals.join("\n") : "",
  };
}

export function buildPayloadFromForm(state: ReviewFormState): ReviewPayload {
  const ratingValue = state.rating.trim();
  const numericRating = ratingValue ? Number(ratingValue) : null;
  const rating =
    numericRating !== null && Number.isFinite(numericRating)
      ? numericRating
      : null;

  const goals = state.goals
    .split(/\r?\n/)
    .map((goal) => goal.trim())
    .filter(Boolean);

  return {
    reviewDate: state.reviewDate,
    rating,
    summary: state.summary.trim(),
    strengths: state.strengths.trim(),
    areasForImprovement: state.areasForImprovement.trim(),
    goals,
  };
}
