import { apiFetch } from './client';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  templateId: string;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  dueDate?: string;
  selfReviewData?: any;
  reviewerData?: any;
  finalScore?: number;
  createdAt: string;
  updatedAt: string;
  template?: {
    title: string;
  };
  reviewer?: {
    firstName: string;
    lastName: string;
  };
}

/**
 * Get performance reviews for the current user
 */
export async function getMyPerformanceReviews(): Promise<PerformanceReview[]> {
  const response = await apiFetch('/api/performance/reviews?scope=my', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch performance reviews');
  }

  return response.json();
}

/**
 * Get performance review details
 */
export async function getPerformanceReviewDetails(reviewId: string): Promise<PerformanceReview> {
  const response = await apiFetch(`/api/performance/reviews/${reviewId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch review details');
  }

  return response.json();
}

/**
 * Submit self-review
 */
export async function submitSelfReview(reviewId: string, data: any): Promise<PerformanceReview> {
  const response = await apiFetch(`/api/performance/reviews/${reviewId}/self-review`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit self-review');
  }

  return response.json();
}

/**
 * Get objectives
 */
export async function getMyObjectives() {
  const response = await apiFetch('/api/objectives?scope=my', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch objectives');
  }

  return response.json();
}
