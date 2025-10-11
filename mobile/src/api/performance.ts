const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

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
  const response = await fetch(`${API_BASE_URL}/api/performance/reviews?scope=my`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`${API_BASE_URL}/api/performance/reviews/${reviewId}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`${API_BASE_URL}/api/performance/reviews/${reviewId}/self-review`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`${API_BASE_URL}/api/objectives?scope=my`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch objectives');
  }

  return response.json();
}
