"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ClipboardList, History, Pencil } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import Button from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatLondon, formatLondonDate } from "@/lib/time";
import { toast } from "sonner";

interface Reviewer {
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

function formatReviewerName(reviewer: Reviewer | null): string {
  if (!reviewer) {
    return "Reviewer not recorded";
  }
  const parts = [reviewer.firstName, reviewer.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Reviewer";
}

export default function PerformancePage() {
  const params = useParams();
  const employeeId = params?.id as string | undefined;

  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(
    null,
  );
  const [formState, setFormState] = useState<ReviewFormState>(() =>
    createEmptyFormState(),
  );
  const [saving, setSaving] = useState(false);

  const fetchReviews = useCallback(
    async (showSpinner = false) => {
      if (!employeeId) {
        return;
      }
      if (showSpinner) {
        setLoading(true);
      }
      try {
        setError(null);
        const response = await fetch(
          `/api/employees/${employeeId}/performance-reviews`,
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load performance reviews");
        }
        const data = (await response.json()) as PerformanceReview[];
        setReviews(data);
      } catch (err) {
        console.error("Failed to load performance reviews", err);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load performance reviews";
        setError(message);
        toast.error(message);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [employeeId],
  );

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }
    fetchReviews(true);
  }, [employeeId, fetchReviews]);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      return (
        new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
      );
    });
  }, [reviews]);

  const handleOpenCreate = () => {
    setEditingReview(null);
    setFormState(createEmptyFormState());
    setDialogOpen(true);
  };

  const handleEdit = (review: PerformanceReview) => {
    setEditingReview(review);
    setFormState(createFormStateFromReview(review));
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeId) {
      return;
    }
    if (!formState.reviewDate) {
      toast.error("Review date is required");
      return;
    }

    const payload = buildPayloadFromForm(formState);

    setSaving(true);
    try {
      const method = editingReview ? "PUT" : "POST";
      const body = editingReview
        ? { id: editingReview.id, ...payload }
        : payload;

      const response = await fetch(
        `/api/employees/${employeeId}/performance-reviews`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Unable to save review");
      }

      const result = (await response.json()) as { review: PerformanceReview };
      const savedReview = result.review;

      toast.success(
        editingReview ? "Performance review updated" : "Performance review added",
      );

      setDialogOpen(false);
      setEditingReview(null);
      setFormState(createEmptyFormState());

      // Optimistically update list if it exists, otherwise refetch
      setReviews((prev) => {
        const withoutUpdated = editingReview
          ? prev.filter((review) => review.id !== savedReview.id)
          : prev;
        return [savedReview, ...withoutUpdated].sort(
          (a, b) =>
            new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime(),
        );
      });
    } catch (err) {
      console.error("Failed to save performance review", err);
      const message =
        err instanceof Error ? err.message : "Unable to save review";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingReview(null);
      setFormState(createEmptyFormState());
    }
  };

  return (
    <PageShell
      title="Performance Reviews"
      description="Track historical feedback and objectives captured during employee reviews."
      icon={<ClipboardList className="h-6 w-6" />}
      action={
        <Button onClick={handleOpenCreate} variant="primary">
          Log review
        </Button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <LoadingSpinner size="lg" showText text="Loading reviews" />
              <p className="mt-4 text-sm text-muted-foreground">
                Gathering recent performance activity…
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-destructive" />
                Unable to load reviews
              </CardTitle>
              <CardDescription>
                {error || "Something went wrong loading this employee's reviews."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" onClick={() => fetchReviews(true)}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : sortedReviews.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No recorded reviews yet</CardTitle>
              <CardDescription>
                Capture the first performance conversation to build a historical
                timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleOpenCreate}>Record first review</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((review) => (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>
                        Review on {formatLondonDate(review.reviewDate)}
                      </CardTitle>
                      <CardDescription>
                        Reviewed by {formatReviewerName(review.reviewer)} · Updated
                        {" "}
                        {formatLondon(review.updatedAt)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      {typeof review.rating === "number" && (
                        <Badge>Rating {review.rating}/5</Badge>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(review)}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {review.summary && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Summary
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {review.summary}
                      </p>
                    </section>
                  )}

                  {review.strengths && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Strengths highlighted
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {review.strengths}
                      </p>
                    </section>
                  )}

                  {review.areasForImprovement && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Development focus
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {review.areasForImprovement}
                      </p>
                    </section>
                  )}

                  {review.goals && review.goals.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Goals agreed
                      </h3>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                        {review.goals.map((goal, index) => (
                          <li key={`${review.id}-goal-${index}`}>{goal}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReview ? "Edit performance review" : "Log new review"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="review-date">Review date</Label>
                <Input
                  id="review-date"
                  type="date"
                  value={formState.reviewDate}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      reviewDate: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="review-rating">Overall rating</Label>
                <Input
                  id="review-rating"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={5}
                  step={1}
                  placeholder="1-5"
                  value={formState.rating}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      rating: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="review-summary">Review summary</Label>
                <Textarea
                  id="review-summary"
                  value={formState.summary}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="Key themes, tone and overall outcomes"
                  rows={4}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="review-strengths">Strengths celebrated</Label>
                <Textarea
                  id="review-strengths"
                  value={formState.strengths}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      strengths: event.target.value,
                    }))
                  }
                  placeholder="Recognised achievements, behaviours or skills"
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="review-development">Development focus</Label>
                <Textarea
                  id="review-development"
                  value={formState.areasForImprovement}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      areasForImprovement: event.target.value,
                    }))
                  }
                  placeholder="Growth opportunities or areas needing support"
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="review-goals">Goals agreed</Label>
                <Textarea
                  id="review-goals"
                  value={formState.goals}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      goals: event.target.value,
                    }))
                  }
                  placeholder="Enter one goal per line"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleDialogChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={saving}>
                {editingReview ? "Save changes" : "Create review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
